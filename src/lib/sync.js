// src/lib/sync.js
import { supabase } from "./supabase"
import { onLocalMutate } from "./sync-notify"
import { _allDirtyPractice, _markClean as _markCleanPractice } from "./practice-db"
import { whenIdbReady } from "./idb-init"

export const LAST_SYNC_KEY = "nm_last_sync"
const SYNC_DEBOUNCE_MS = 400
const SYNC_HEARTBEAT_MS = 60_000

let syncing = false, scheduled = false, inited = false
let unsubAuth = null, unsubLocal = null, onlineHandler = null, visHandler = null, intervalId = null

let gameFnsLoaded = false
let _allDirtyGame = null
let _markCleanGame = null

async function ensureGameFns() {
  if (gameFnsLoaded) return
  try {
    const gameDb = await import("./game-db")
    _allDirtyGame = gameDb._allDirtyGame || null
    _markCleanGame = gameDb._markClean || null
  } catch {
    _allDirtyGame = null
    _markCleanGame = null
  } finally {
    gameFnsLoaded = true
  }
}

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
  if (typeof bucket === "object") return Object.values(bucket).flat().filter(Boolean)
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
  return rows.map(({ _dirty, _table, ...r }) => {
    // normalize timestamps
    if (typeof r.ts === "number") r.ts = new Date(r.ts).toISOString()
    if (typeof r.started_at === "number") r.started_at = new Date(r.started_at).toISOString()
    if (typeof r.ended_at === "number") r.ended_at = new Date(r.ended_at).toISOString()

    // ensure date_iso is just YYYY-MM-DD (string) if present
    if (r.date_iso instanceof Date) r.date_iso = r.date_iso.toISOString().slice(0,10)
    if (typeof r.date_iso === "string" && r.date_iso.length > 10) r.date_iso = r.date_iso.slice(0,10)

    // hard-normalize home_away for game_sessions rows that slipped through
    if (_table === "game_sessions") {
      r.home_away = normalizeHomeAwayValue(r.home_away)
      if (!r.date_iso) r.date_iso = new Date().toISOString().slice(0,10)
    }

    return r
  })
}

async function pushTable(table, rows) {
  if (!rows.length) return
  const cleanRows = sanitizeForUpsert(rows)
  const { error } = await supabase.from(table).upsert(cleanRows, { onConflict: "id" })
  if (error) {
    // helpful debug: show first row we tried to send
    console.warn(`[sync] upsert error on ${table}`, error, { sample: cleanRows[0] })
    throw error
  }
}

async function pushAll(userId) {
  await ensureGameFns()

  const practiceDirty = toArray(await _allDirtyPractice())
  const gameDirty = toArray(_allDirtyGame ? await _allDirtyGame() : [])

  for (const r of [...practiceDirty, ...gameDirty]) r.user_id = userId

  const byTable = new Map()
  for (const row of [...practiceDirty, ...gameDirty]) {
    const table = row?._table
    if (!table) continue
    if (!byTable.has(table)) byTable.set(table, [])
    byTable.get(table).push(row)
  }

  for (const [table, rows] of byTable) {
    await pushTable(table, rows)
  }

  for (const row of practiceDirty) await _markCleanPractice(row)
  if (_markCleanGame) for (const row of gameDirty) await _markCleanGame(row)
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
  setTimeout(() => { scheduled = false; void doSync() }, SYNC_DEBOUNCE_MS)
}

export function initAutoSync() {
  if (inited) return
  inited = true

  whenIdbReady().then(() => scheduleSync())
  unsubLocal = onLocalMutate(() => scheduleSync())

  const authSub = supabase.auth.onAuthStateChange((_e, s) => { if (s) scheduleSync() })
  unsubAuth = () => authSub?.data?.subscription?.unsubscribe?.()

  onlineHandler = () => scheduleSync()
  visHandler = () => { if (document.visibilityState === "visible") scheduleSync() }
  window.addEventListener("online", onlineHandler)
  document.addEventListener("visibilitychange", visHandler)

  intervalId = window.setInterval(() => scheduleSync(), SYNC_HEARTBEAT_MS)

  scheduleSync()
}

export function teardownAutoSync() {
  if (unsubLocal) { unsubLocal(); unsubLocal = null }
  if (unsubAuth)  { unsubAuth();  unsubAuth = null }
  if (onlineHandler) { window.removeEventListener("online", onlineHandler); onlineHandler = null }
  if (visHandler)    { document.removeEventListener("visibilitychange", visHandler); visHandler = null }
  if (intervalId)    { clearInterval(intervalId); intervalId = null }
  inited = false
}
