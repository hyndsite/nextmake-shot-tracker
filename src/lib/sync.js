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

/**
 * We keep the existing sanitizer, but we also use it for single-row upserts.
 * NOTE: This file intentionally does not change event creation semantics—only push behavior.
 */
function sanitizeForUpsert(rows) {
  return rows.map(({ _dirty, _table, _deleted, ...r }) => {
    // normalize timestamps
    if (typeof r.ts === "number") r.ts = new Date(r.ts).toISOString()
    if (typeof r.started_at === "number")
      r.started_at = new Date(r.started_at).toISOString()
    if (typeof r.ended_at === "number")
      r.ended_at = new Date(r.ended_at).toISOString()

    // ensure date_iso is just YYYY-MM-DD (string) if present
    if (r.date_iso instanceof Date) r.date_iso = r.date_iso.toISOString().slice(0, 10)
    if (typeof r.date_iso === "string" && r.date_iso.length > 10)
      r.date_iso = r.date_iso.slice(0, 10)

    // normalize home_away for game_sessions rows
    if (_table === "game_sessions") {
      r.home_away = normalizeHomeAwayValue(r.home_away)
      if (!r.date_iso) r.date_iso = new Date().toISOString().slice(0, 10)
    }

    // ---- practice table whitelists ----
    if (_table === "practice_sessions") {
      const { id, user_id, date_iso, started_at, ended_at, status } = r
      return { id, user_id, date_iso, started_at, ended_at, status }
    }

    if (_table === "practice_entries") {
      const {
        id,
        user_id,
        session_id,
        zone_id,
        shot_type,
        // canonical column is contested; legacy queued rows may still have pressured
        contested,
        pressured,
        attempts,
        makes,
        ts,
      } = r

      const resolvedContested =
        typeof contested !== "undefined"
          ? !!contested
          : typeof pressured !== "undefined"
            ? !!pressured
            : null

      return {
        id,
        user_id,
        session_id,
        zone_id,
        shot_type,
        contested: resolvedContested,
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

/**
 * Supabase/Postgres errors we should treat as "non-retryable for this row"
 * (i.e., quarantine/skip) so later rows can still sync.
 *
 * We intentionally keep this conservative:
 * - 23*** = integrity constraint violations
 * - 22*** = data exception / invalid text representation
 */
function isNonRetryableRowError(error) {
  if (!error) return false
  const code = String(error.code || "")
  if (code.startsWith("23") || code.startsWith("22")) return true
  // Some Supabase errors may not include a code but include HTTP-ish status.
  const status = Number(error.status || error.statusCode || error?.cause?.status)
  if (status === 400 || status === 401 || status === 403) return true
  return false
}

async function upsertOne(table, row) {
  const [cleanRow] = sanitizeForUpsert([row])
  const { error } = await supabase.from(table).upsert([cleanRow], { onConflict: "id" })
  if (error) {
    console.warn(`[sync] upsert error on ${table}`, error, { sample: cleanRow })
    throw error
  }
}

async function deleteOne(table, row) {
  const id = row?.id
  if (!id) return
  const { error } = await supabase.from(table).delete().eq("id", id)
  if (error) {
    console.warn(`[sync] delete error on ${table}`, error, { sample: id })
    throw error
  }
}

/**
 * Single-row push loop.
 */
async function pushAll(userId) {
  const practiceDirty = toArray(await _allDirtyPractice())
  const gameDirty = toArray(await _allDirtyGame())

  // attach user_id (required server-side)
  for (const r of [...practiceDirty, ...gameDirty]) {
    r.user_id = userId
  }

  // Stable ordering: sessions before events, then by timestamp-ish fields
  const typeRank = (t) => {
    if (t === "practice_sessions") return 10
    if (t === "practice_entries") return 20
    if (t === "practice_markers") return 30
    if (t === "game_sessions") return 40
    if (t === "game_events") return 50
    return 99
  }

  const tsValue = (row) => {
    const v = row?.ts || row?.started_at || row?.ended_at || row?.date_iso || null
    if (!v) return Number.MAX_SAFE_INTEGER
    const d = new Date(v).getTime()
    return Number.isFinite(d) ? d : Number.MAX_SAFE_INTEGER
  }

  const allDirty = [...practiceDirty, ...gameDirty]
    .filter((r) => r && r._table && r.id)
    .sort((a, b) => {
      const ra = typeRank(a._table)
      const rb = typeRank(b._table)
      if (ra !== rb) return ra - rb
      return tsValue(a) - tsValue(b)
    })

  for (const row of allDirty) {
    const table = row._table
    if (!table) continue

    const isPractice = table.startsWith("practice_")
    const markClean = isPractice ? _markCleanPractice : _markCleanGame
    const purgeRow = isPractice ? _purgePracticeRow : _purgeGameRow

    try {
      if (row._deleted) {
        await deleteOne(table, row)
        await purgeRow(row)
      } else {
        await upsertOne(table, row)
        await markClean(row)
      }
    } catch (err) {
      if (isNonRetryableRowError(err)) {
        console.warn(
          `[sync] non-retryable row rejected; skipping row so later rows can sync`,
          {
            table,
            id: row.id,
            code: err?.code,
            message: err?.message,
          },
        )

        await markClean({
          ...row,
          _sync_failed: true,
          _sync_error_code: err?.code ?? null,
          _sync_error_message: err?.message ?? null,
          _sync_error_at: new Date().toISOString(),
        })

        continue
      }

      console.error("[sync] retryable push error (will retry later):", err)
      if (!navigator.onLine) break
      continue
    }
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
