// src/lib/practice-db.js
// Offline-first Practice storage using idb-keyval.

import { createStore, get, set, del } from "idb-keyval"
import { uuid } from "./util-id"
import { notifyLocalMutate } from "./sync-notify"
import { ZONES } from "../constants/zones"
import { getActiveAthleteId } from "./athlete-db"

// ---- Stores ----
export const st = {
  practice: {
    sessions: createStore("nm_practice_sessions", "kv"),
    entries: createStore("nm_practice_entries", "kv"),
    markers: createStore("nm_practice_markers", "kv"),
  },
}

// ---- Index helpers ----
const IDX_KEY = "__index__"
const todayISO = () => new Date().toISOString().slice(0, 10)
const nowISO = () => new Date().toISOString()

function belongsToActiveAthlete(rowAthleteId) {
  const activeAthleteId = getActiveAthleteId()
  if (!activeAthleteId) return true
  // Legacy rows may not have athlete_id yet; keep visible until full backfill.
  if (!rowAthleteId) return true
  return rowAthleteId === activeAthleteId
}

async function readIndex(store) {
  return (await get(IDX_KEY, store)) ?? []
}
async function writeIndex(store, arr) {
  await set(IDX_KEY, arr, store)
}
async function addToIndex(store, id) {
  const idx = await readIndex(store)
  if (!idx.includes(id)) {
    idx.push(id)
    await writeIndex(store, idx)
  }
}
async function removeFromIndex(store, id) {
  const idx = await readIndex(store)
  const next = idx.filter((x) => x !== id)
  if (next.length !== idx.length) {
    await writeIndex(store, next)
  }
}

// 3PT lookup by zone id for eFG
const ZONE_IS_THREE = Object.fromEntries(ZONES.map((z) => [z.id, !!z.isThree]))

// ---- Sessions ----
export async function addPracticeSession({
  dateISO = todayISO(),
  athleteId,
  athlete_id,
} = {}) {
  const id = uuid()
  const resolvedAthleteId = athlete_id ?? athleteId ?? getActiveAthleteId() ?? null
  const row = {
    id,
    user_id: null,
    athlete_id: resolvedAthleteId,
    // `mode` is local-only; never sent to Supabase
    mode: "practice",
    date_iso: dateISO,
    started_at: nowISO(),
    ended_at: null,
    status: "active",
    _dirty: true,
    _deleted: false,
    _table: "practice_sessions",
  }
  await set(id, row, st.practice.sessions)
  await addToIndex(st.practice.sessions, id)
  notifyLocalMutate()
  return row
}

export async function endPracticeSession(id) {
  const s = await get(id, st.practice.sessions)
  if (!s) return null
  const updated = {
    ...s,
    ended_at: nowISO(),
    status: "ended",
    _dirty: true,
    _table: "practice_sessions",
  }
  await set(id, updated, st.practice.sessions)
  notifyLocalMutate()
  return updated
}

export async function listPracticeSessions() {
  const ids = await readIndex(st.practice.sessions)
  const rows = []
  for (const id of ids) {
    const row = await get(id, st.practice.sessions)
    if (row && !row._deleted && belongsToActiveAthlete(row.athlete_id)) rows.push(row)
  }
  rows.sort((a, b) => (b.started_at || "").localeCompare(a.started_at || ""))
  return rows
}

// ---- Entries & Markers ----
export async function addEntry({
  sessionId,
  athleteId,
  athlete_id,
  zoneId,
  shotType,
  // Canonical name is `contested`.
  // We still accept legacy `pressured` so older callers don't break.
  contested,
  pressured,
  attempts = 0,
  makes = 0,
  ts = nowISO(),
  // layup-specific metadata (optional)
  pickupType = null,
  finishType = null,
}) {
  const id = uuid()
  const parentSession = sessionId ? await get(sessionId, st.practice.sessions) : null
  const resolvedAthleteId =
    athlete_id ??
    athleteId ??
    parentSession?.athlete_id ??
    getActiveAthleteId() ??
    null

  const resolvedContested =
    typeof contested !== "undefined"
      ? !!contested
      : typeof pressured !== "undefined"
        ? !!pressured
        : false

  const row = {
    id,
    user_id: null,
    athlete_id: resolvedAthleteId,
    mode: "practice", // local-only
    session_id: sessionId,
    zone_id: zoneId,
    shot_type: shotType,
    // layup metadata
    pickup_type: pickupType,
    finish_type: finishType,
    // canonical field
    contested: resolvedContested,
    attempts: Number(attempts),
    makes: Number(makes),
    ts,
    _dirty: true,
    _deleted: false,
    _table: "practice_entries",
  }

  await set(id, row, st.practice.entries)
  await addToIndex(st.practice.entries, id)
  notifyLocalMutate()
  return row
}

/**
 * Update an existing practice entry (offline-first).
 * This keeps the same id and marks the row dirty so sync can upsert it.
 */
export async function updateEntry({
  id,
  sessionId,
  zoneId,
  shotType,
  contested,
  attempts = 0,
  makes = 0,
  ts,
  pickupType = null,
  finishType = null,
}) {
  if (!id) throw new Error("updateEntry requires id")

  const cur = await get(id, st.practice.entries)
  if (!cur) throw new Error(`practice entry not found: ${id}`)

  const updated = {
    ...cur,
    session_id: sessionId ?? cur.session_id,
    zone_id: zoneId ?? cur.zone_id,
    shot_type: typeof shotType === "undefined" ? cur.shot_type : shotType,
    contested: typeof contested === "undefined" ? cur.contested : !!contested,
    attempts: Number(attempts),
    makes: Number(makes),
    ts: ts ?? cur.ts,
    pickup_type: pickupType,
    finish_type: finishType,
    _dirty: true,
    _deleted: false,
    _table: "practice_entries",
  }

  await set(id, updated, st.practice.entries)
  await addToIndex(st.practice.entries, id)
  notifyLocalMutate()
  return updated
}

/**
 * Soft-delete an entry: mark _deleted=true so sync deletes it in Supabase.
 */
export async function deleteEntry(id) {
  if (!id) return null
  const cur = await get(id, st.practice.entries)
  if (!cur) return null

  const updated = {
    ...cur,
    _deleted: true,
    _dirty: true,
    _table: "practice_entries",
  }

  await set(id, updated, st.practice.entries)
  notifyLocalMutate()
  return updated
}

export async function addMarker({
  sessionId,
  athleteId,
  athlete_id,
  label = "",
  ts = nowISO(),
}) {
  const id = uuid()
  const parentSession = sessionId ? await get(sessionId, st.practice.sessions) : null
  const resolvedAthleteId =
    athlete_id ??
    athleteId ??
    parentSession?.athlete_id ??
    getActiveAthleteId() ??
    null
  const row = {
    id,
    user_id: null,
    athlete_id: resolvedAthleteId,
    mode: "practice", // local-only
    session_id: sessionId,
    label,
    ts,
    _dirty: true,
    _deleted: false,
    _table: "practice_markers",
  }
  await set(id, row, st.practice.markers)
  await addToIndex(st.practice.markers, id)
  notifyLocalMutate()
  return row
}

// ---- Aggregates (today summary) ----
export async function getTodaySummary() {
  const today = todayISO()
  const entryIds = await readIndex(st.practice.entries)

  let attempts = 0
  let makes = 0
  let threesAttempts = 0
  let threesMakes = 0

  for (const id of entryIds) {
    const e = await get(id, st.practice.entries)
    if (!e || e._deleted) continue

    const s = await get(e.session_id, st.practice.sessions)
    if (!s || s._deleted || s.date_iso !== today) continue

    const a = Number(e.attempts || 0)
    const m = Number(e.makes || 0)
    attempts += a
    makes += m

    if (ZONE_IS_THREE[e.zone_id]) {
      threesAttempts += a
      threesMakes += m
    }
  }

  const fg = attempts ? makes / attempts : 0
  const efg = attempts ? (makes + 0.5 * threesMakes) / attempts : 0
  return { date: today, attempts, makes, fg, efg, threesAttempts, threesMakes }
}

// ---- High-level delete (user-facing) ----
export async function deletePracticeSession(id) {
  if (!id) return
  // mark entries
  for (const eid of await readIndex(st.practice.entries)) {
    const e = await get(eid, st.practice.entries)
    if (e?.session_id === id) {
      const updated = {
        ...e,
        _deleted: true,
        _dirty: true,
        _table: "practice_entries",
      }
      await set(eid, updated, st.practice.entries)
    }
  }
  // mark markers
  for (const mid of await readIndex(st.practice.markers)) {
    const m = await get(mid, st.practice.markers)
    if (m?.session_id === id) {
      const updated = {
        ...m,
        _deleted: true,
        _dirty: true,
        _table: "practice_markers",
      }
      await set(mid, updated, st.practice.markers)
    }
  }
  // mark session
  const s = await get(id, st.practice.sessions)
  if (s) {
    const updatedSession = {
      ...s,
      _deleted: true,
      _dirty: true,
      _table: "practice_sessions",
    }
    await set(id, updatedSession, st.practice.sessions)
  }
  notifyLocalMutate()
}

// ---- Sync hooks ----
export async function _allDirtyPractice() {
  const bucket = []
  for (const id of await readIndex(st.practice.sessions)) {
    const row = await get(id, st.practice.sessions)
    if (row?._dirty) bucket.push(row)
  }
  for (const id of await readIndex(st.practice.entries)) {
    const row = await get(id, st.practice.entries)
    if (row?._dirty) bucket.push(row)
  }
  for (const id of await readIndex(st.practice.markers)) {
    const row = await get(id, st.practice.markers)
    if (row?._dirty) bucket.push(row)
  }
  return bucket
}

export async function _markClean(row) {
  if (!row?._table) return
  let store = null
  if (row._table === "practice_sessions") store = st.practice.sessions
  else if (row._table === "practice_entries") store = st.practice.entries
  else if (row._table === "practice_markers") store = st.practice.markers
  if (!store) return
  const cur = await get(row.id, store)
  if (!cur) return
  const updated = { ...cur, ...row, _dirty: false }
  await set(row.id, updated, store)
}

/**
 * After a remote delete succeeds, completely remove
 * the row from IndexedDB and its index.
 */
export async function _purgePracticeRow(row) {
  if (!row?._table) return
  let store = null
  if (row._table === "practice_sessions") store = st.practice.sessions
  else if (row._table === "practice_entries") store = st.practice.entries
  else if (row._table === "practice_markers") store = st.practice.markers
  if (!store) return

  await del(row.id, store)
  await removeFromIndex(store, row.id)
}

export async function listActivePracticeSessions() {
  const all = await listPracticeSessions()
  return all
    .filter((s) => s?.status === "active" && !s?.ended_at)
    .sort((a, b) => (b.started_at || "").localeCompare(a.started_at || ""))
}

// List entries for a given practice session, oldest→newest
export async function listEntriesBySession(sessionId) {
  const ids = await readIndex(st.practice.entries)
  const rows = []
  for (const id of ids) {
    const e = await get(id, st.practice.entries)
    if (
      e?.session_id === sessionId &&
      !e._deleted &&
      belongsToActiveAthlete(e.athlete_id)
    ) rows.push(e)
  }
  rows.sort((a, b) => (a.ts || "").localeCompare(b.ts || ""))
  return rows
}

/* -----------------------------
 * Remote → local helpers
 * ---------------------------*/

export async function upsertPracticeSessionsFromRemote(rows = []) {
  const remoteIds = new Set(rows.map((r) => r.id).filter(Boolean))

  const localIds = await readIndex(st.practice.sessions)
  for (const id of localIds) {
    const local = await get(id, st.practice.sessions)
    if (!local) continue
    if (local._dirty) continue
    if (!remoteIds.has(id)) {
      await del(id, st.practice.sessions)
      await removeFromIndex(st.practice.sessions, id)
    }
  }

  for (const remote of rows) {
    if (!remote?.id) continue
    const existing = await get(remote.id, st.practice.sessions)
    const merged = {
      ...(existing || {}),
      ...remote,
      _dirty: false,
      _deleted: false,
      _table: "practice_sessions",
    }
    await set(remote.id, merged, st.practice.sessions)
    await addToIndex(st.practice.sessions, remote.id)
  }
}

export async function upsertPracticeEntriesFromRemote(rows = []) {
  const remoteIds = new Set(rows.map((r) => r.id).filter(Boolean))

  const localIds = await readIndex(st.practice.entries)
  for (const id of localIds) {
    const local = await get(id, st.practice.entries)
    if (!local) continue
    if (local._dirty) continue
    if (!remoteIds.has(id)) {
      await del(id, st.practice.entries)
      await removeFromIndex(st.practice.entries, id)
    }
  }

  for (const remote of rows) {
    if (!remote?.id) continue
    const existing = await get(remote.id, st.practice.entries)
    const merged = {
      ...(existing || {}),
      ...remote,
      _dirty: false,
      _deleted: false,
      _table: "practice_entries",
    }
    await set(remote.id, merged, st.practice.entries)
    await addToIndex(st.practice.entries, remote.id)
  }
}

export async function upsertPracticeMarkersFromRemote(rows = []) {
  const remoteIds = new Set(rows.map((r) => r.id).filter(Boolean))

  const localIds = await readIndex(st.practice.markers)
  for (const id of localIds) {
    const local = await get(id, st.practice.markers)
    if (!local) continue
    if (local._dirty) continue
    if (!remoteIds.has(id)) {
      await del(id, st.practice.markers)
      await removeFromIndex(st.practice.markers, id)
    }
  }

  for (const remote of rows) {
    if (!remote?.id) continue
    const existing = await get(remote.id, st.practice.markers)
    const merged = {
      ...(existing || {}),
      ...remote,
      _dirty: false,
      _deleted: false,
      _table: "practice_markers",
    }
    await set(remote.id, merged, st.practice.markers)
    await addToIndex(st.practice.markers, remote.id)
  }
}
