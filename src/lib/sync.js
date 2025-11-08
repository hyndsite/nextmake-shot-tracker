// src/lib/sync.js
import { supabase } from "./supabase"
import { onLocalMutate } from "./sync-notify"
import {
  _allDirtyPractice,
  _markClean as _markCleanPractice,
  _purgePracticeRow,
  upsertPracticeSessionsFromRemote,
  upsertPracticeEntriesFromRemote,
  upsertPracticeMarkersFromRemote,
} from "./practice-db"
import { whenIdbReady } from "./idb-init"
import {
  upsertGameSessionsFromRemote,
  upsertGameEventsFromRemote,
  _allDirtyGame,
  _markClean as _markCleanGame,
  _purgeGameRow,
} from "./game-db"

export const LAST_SYNC_KEY = "nm_last_sync"
const SYNC_DEBOUNCE_MS = 400
const SYNC_HEARTBEAT_MS = 60_000

let syncing = false,
  scheduled = false,
  inited = false
let unsubAuth = null,
  unsubLocal = null,
  onlineHandler = null,
  visHandler = null,
  intervalId = null

// --------- bootstrap ALL data (game + practice) on app refresh ----------
export async function bootstrapAllData() {
  // 1) Check auth
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  const user = data?.user
  if (!user) return { user: null }

  const userId = user.id

  // 2) Pull all relevant rows for this user
  const [
    { data: gameSessions, error: gameSessErr },
    { data: gameEvents, error: gameEvErr },
    { data: practiceSess, error: pracSessErr },
    { data: practiceEntries, error: pracEntryErr },
    { data: practiceMarks, error: pracMarkErr },
  ] = await Promise.all([
    supabase
      .from("game_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("date_iso", { ascending: false }),

    supabase
      .from("game_events")
      .select("*")
      .eq("user_id", userId)
      .order("ts", { ascending: true }),

    supabase
      .from("practice_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false }),

    supabase
      .from("practice_entries")
      .select("*")
      .eq("user_id", userId)
      .order("ts", { ascending: true }),

    supabase
      .from("practice_markers")
      .select("*")
      .eq("user_id", userId)
      .order("ts", { ascending: true }),
  ])

  if (gameSessErr) throw gameSessErr
  if (gameEvErr) throw gameEvErr
  if (pracSessErr) throw pracSessErr
  if (pracEntryErr) throw pracEntryErr
  if (pracMarkErr) throw pracMarkErr

  // 3) Store them locally as "clean" (with reconciliation handled in helpers)
  await Promise.all([
    upsertGameSessionsFromRemote(gameSessions || []),
    upsertGameEventsFromRemote(gameEvents || []),
    upsertPracticeSessionsFromRemote(practiceSess || []),
    upsertPracticeEntriesFromRemote(practiceEntries || []),
    upsertPracticeMarkersFromRemote(practiceMarks || []),
  ])

  return {
    user,
    gameSessionsCount: gameSessions?.length ?? 0,
    gameEventsCount: gameEvents?.length ?? 0,
    practiceSessionsCount: practiceSess?.length ?? 0,
    practiceEntriesCount: practiceEntries?.length ?? 0,
    practiceMarkersCount: practiceMarks?.length ?? 0,
  }
}

// Backwards compatibility
export async function bootstrapGameData() {
  return bootstrapAllData()
}

// --------- internal helpers for push sync ----------

function setLastSyncNow() {
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
}

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id || null
}

function toArray(bucket) {
  if (!bucket) return []
  if (Array.isArray(bucket)) return bucket
  if (typeof bucket === "object")
    return Object.values(bucket).flat().filter(Boolean)
  return []
}

function normalizeHomeAwayValue(v) {
  if (v == null) return "Home"
  const s = String(v).trim().toLowerCase()
  if (s === "home" || s === "h") return "Home"
  if (s === "away" || s === "a") return "Away"
  return "Home"
}

function sanitizeForUpsert(rows) {
  return rows.map(({ _dirty, _table, _deleted, ...r }) => {
    // normalize timestamps
    if (typeof r.ts === "number")
      r.ts = new Date(r.ts).toISOString()
    if (typeof r.started_at === "number")
      r.started_at = new Date(r.started_at).toISOString()
    if (typeof r.ended_at === "number")
      r.ended_at = new Date(r.ended_at).toISOString()

    // ensure date_iso is just YYYY-MM-DD (string) if present
    if (r.date_iso instanceof Date)
      r.date_iso = r.date_iso.toISOString().slice(0, 10)
    if (typeof r.date_iso === "string" && r.date_iso.length > 10)
      r.date_iso = r.date_iso.slice(0, 10)

    // normalize home_away for game_sessions rows
    if (_table === "game_sessions") {
      r.home_away = normalizeHomeAwayValue(r.home_away)
      if (!r.date_iso) r.date_iso = new Date().toISOString().slice(0, 10)
    }

    // ---- practice table whitelists ----
    if (_table === "practice_sessions") {
      const {
        id,
        user_id,
        date_iso,
        started_at,
        ended_at,
        status,
      } = r
      return { id, user_id, date_iso, started_at, ended_at, status }
    }

    if (_table === "practice_entries") {
      const {
        id,
        user_id,
        session_id,
        zone_id,
        shot_type,
        pressured,
        attempts,
        makes,
        ts,
      } = r
      return {
        id,
        user_id,
        session_id,
        zone_id,
        shot_type,
        pressured,
        attempts,
        makes,
        ts,
      }
    }

    if (_table === "practice_markers") {
      const { id, user_id, session_id, label, ts } = r
      return { id, user_id, session_id, label, ts }
    }

    return r
  })
}

async function pushTableUpserts(table, rows) {
  if (!rows.length) return
  const cleanRows = sanitizeForUpsert(rows)
  const { error } = await supabase.from(table).upsert(cleanRows, {
    onConflict: "id",
  })
  if (error) {
    console.warn(`[sync] upsert error on ${table}`, error, {
      sample: cleanRows[0],
    })
    throw error
  }
}

async function pushTableDeletes(table, rows) {
  if (!rows.length) return
  const ids = rows.map((r) => r.id).filter(Boolean)
  if (!ids.length) return
  const { error } = await supabase.from(table).delete().in("id", ids)
  if (error) {
    console.warn(`[sync] delete error on ${table}`, error, {
      sample: ids[0],
    })
    throw error
  }
}

async function pushAll(userId) {
  const practiceDirty = toArray(await _allDirtyPractice())
  const gameDirty = toArray(await _allDirtyGame())

  // attach user_id
  for (const r of [...practiceDirty, ...gameDirty]) {
    r.user_id = userId
  }

  const upsertsByTable = new Map()
  const deletesByTable = new Map()

  function addRow(map, table, row) {
    if (!table) return
    if (!map.has(table)) map.set(table, [])
    map.get(table).push(row)
  }

  for (const row of [...practiceDirty, ...gameDirty]) {
    const table = row?._table
    if (!table) continue
    if (row._deleted) {
      addRow(deletesByTable, table, row)
    } else {
      addRow(upsertsByTable, table, row)
    }
  }

  // First upserts (create/update)
  for (const [table, rows] of upsertsByTable) {
    await pushTableUpserts(table, rows)
  }

  // Then deletes
  for (const [table, rows] of deletesByTable) {
    await pushTableDeletes(table, rows)
  }

  // Finally, update local flags / purge
  for (const row of practiceDirty) {
    if (row._deleted) await _purgePracticeRow(row)
    else await _markCleanPractice(row)
  }
  for (const row of gameDirty) {
    if (row._deleted) await _purgeGameRow(row)
    else await _markCleanGame(row)
  }
}

async function doSync() {
  if (syncing) return
  if (!navigator.onLine) return
  await whenIdbReady()

  const userId = await getUserId()
  if (!userId) return

  syncing = true
  try {
    await pushAll(userId)
    setLastSyncNow()
  } catch (err) {
    console.error("[sync] push error:", err)
  } finally {
    syncing = false
  }
}

function scheduleSync() {
  if (scheduled) return
  scheduled = true
  setTimeout(() => {
    scheduled = false
    void doSync()
  }, SYNC_DEBOUNCE_MS)
}

export function initAutoSync() {
  if (inited) return
  inited = true

  whenIdbReady().then(() => scheduleSync())
  unsubLocal = onLocalMutate(() => scheduleSync())

  const authSub = supabase.auth.onAuthStateChange((_e, s) => {
    if (s) scheduleSync()
  })
  unsubAuth = () => authSub?.data?.subscription?.unsubscribe?.()

  onlineHandler = () => scheduleSync()
  visHandler = () => {
    if (document.visibilityState === "visible") scheduleSync()
  }
  window.addEventListener("online", onlineHandler)
  document.addEventListener("visibilitychange", visHandler)

  intervalId = window.setInterval(() => scheduleSync(), SYNC_HEARTBEAT_MS)

  scheduleSync()
}

export function teardownAutoSync() {
  if (unsubLocal) {
    unsubLocal()
    unsubLocal = null
  }
  if (unsubAuth) {
    unsubAuth()
    unsubAuth = null
  }
  if (onlineHandler) {
    window.removeEventListener("online", onlineHandler)
    onlineHandler = null
  }
  if (visHandler) {
    document.removeEventListener("visibilitychange", visHandler)
    visHandler = null
  }
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  inited = false
}

// Used by sync-hooks (manual / status-based syncing)
export async function syncAll() {
  await doSync()
  await bootstrapAllData()
}
