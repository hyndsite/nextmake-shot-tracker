// src/lib/sync.js
// Auto-sync engine: pushes local IndexedDB changes to Supabase automatically.
// - No manual buttons
// - Safe if game-db isn't implemented yet
// - Filters local-only fields (_dirty, _table) before sending
// - Debounced; triggers on local writes, auth changes, going online, visibility, and a heartbeat

import { supabase } from "./supabase"
import { onLocalMutate } from "./sync-notify"
import { _allDirtyPractice, _markClean as _markCleanPractice } from "./practice-db"

export const LAST_SYNC_KEY = "nm_last_sync"

const SYNC_DEBOUNCE_MS = 400
const SYNC_HEARTBEAT_MS = 60_000 // run at least once a minute

let syncing = false
let scheduled = false
let inited = false

let unsubAuth = null
let unsubLocal = null
let onlineHandler = null
let visHandler = null
let intervalId = null

// ---- Optional game sync (loaded lazily) ------------------------------------

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
    // game-db not present yet; that's fine
    _allDirtyGame = null
    _markCleanGame = null
  } finally {
    gameFnsLoaded = true
  }
}

// ---- Helpers ----------------------------------------------------------------

function setLastSyncNow() {
  const ts = new Date().toISOString()
  localStorage.setItem(LAST_SYNC_KEY, ts)
}

async function getUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user.id
}

function ensureArray(maybeArr) {
  return Array.isArray(maybeArr) ? maybeArr : []
}

function stampUser(rows, userId) {
  for (const r of rows) r.user_id = userId
  return rows
}

async function pushTable(table, rows) {
  if (!rows.length) return
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" })
  if (error) throw error
}

// ---- Core sync steps ---------------------------------------------------------

async function pushAll(userId) {
  await ensureGameFns()

  // 1) Collect all dirty rows (defensively coerce to arrays)
  const practiceBucket = ensureArray(await _allDirtyPractice())
  const gameBucket = _allDirtyGame ? ensureArray(await _allDirtyGame()) : []

  // 2) Tag rows with user_id before sending
  stampUser(practiceBucket, userId)
  stampUser(gameBucket, userId)

  // 3) Group by server table for efficient upserts
  const byTable = new Map()
  for (const row of [...practiceBucket, ...gameBucket]) {
    const table = row?._table
    if (!table) continue
    if (!byTable.has(table)) byTable.set(table, [])
    byTable.get(table).push(row)
  }

  // 4) Sanitize local-only fields and push per table
  for (const [table, rows] of byTable) {
    const cleanRows = rows.map((r) => {
      const { _dirty, _table, ...safe } = r
      return safe
    })
    await pushTable(table, cleanRows)
  }

  // 5) Mark local rows clean after successful push
  for (const row of practiceBucket) {
    await _markCleanPractice(row)
  }
  if (_markCleanGame) {
    for (const row of gameBucket) {
      await _markCleanGame(row)
    }
  }
}

async function doSync() {
  if (syncing) return
  if (!navigator.onLine) return

  const userId = await getUserId()
  if (!userId) return

  syncing = true
  try {
    await pushAll(userId)
    setLastSyncNow()
  } catch (err) {
    // eslint-disable-next-line no-console
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

// ---- Public API --------------------------------------------------------------

/**
 * Initialize the auto-sync engine once.
 * Safe to call multiple times; subsequent calls are ignored.
 */
export function initAutoSync() {
  if (inited) return
  inited = true

  // A) React to local IndexedDB mutations (practice-db/game-db call notifyLocalMutate)
  unsubLocal = onLocalMutate(() => scheduleSync())

  // B) React to auth changes (login/logout)
  const authSub = supabase.auth.onAuthStateChange((_event, session) => {
    if (session) scheduleSync()
  })
  unsubAuth = () => authSub?.data?.subscription?.unsubscribe?.()

  // C) Online / tab visibility events
  onlineHandler = () => scheduleSync()
  visHandler = () => { if (document.visibilityState === "visible") scheduleSync() }
  window.addEventListener("online", onlineHandler)
  document.addEventListener("visibilitychange", visHandler)

  // D) Heartbeat to catch missed triggers
  intervalId = window.setInterval(() => scheduleSync(), SYNC_HEARTBEAT_MS)

  // E) Attempt one sync on boot (debounced)
  scheduleSync()
}

/**
 * Teardown listeners (useful for tests/HMR). You usually won't need this in prod.
 */
export function teardownAutoSync() {
  if (unsubLocal) { unsubLocal(); unsubLocal = null }
  if (unsubAuth)  { unsubAuth();  unsubAuth = null }
  if (onlineHandler) { window.removeEventListener("online", onlineHandler); onlineHandler = null }
  if (visHandler)    { document.removeEventListener("visibilitychange", visHandler); visHandler = null }
  if (intervalId)    { clearInterval(intervalId); intervalId = null }
  inited = false
}
