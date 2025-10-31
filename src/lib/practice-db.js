// src/lib/practice-db.js
// Offline-first Practice storage using idb-keyval.
// IMPORTANT: each object store uses its OWN DB to avoid upgrade deadlocks.
// This prevents the "transaction: object store not found" and hangs you saw.

import { createStore, get, set, del } from "idb-keyval"
import { uuid } from "./util-id"
import { notifyLocalMutate } from "./sync-notify"
import { ZONES } from "../constants/zones"

// ---- Stores (separate DB per store = no version conflicts) ----
export const st = {
  practice: {
    sessions: createStore("nm_practice_sessions", "kv"),
    entries:  createStore("nm_practice_entries",  "kv"),
    markers:  createStore("nm_practice_markers",  "kv"),
  },
}

// ---- Small helpers ----
const IDX_KEY = "__index__"
const todayISO = () => new Date().toISOString().slice(0, 10)
const nowISO   = () => new Date().toISOString()

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
  const next = idx.filter(x => x !== id)
  if (next.length !== idx.length) await writeIndex(store, next)
}

// 3PT lookup by zone id for eFG
const ZONE_IS_THREE = Object.fromEntries(ZONES.map(z => [z.id, !!z.isThree]))

// ---- Sessions ----
export async function addPracticeSession({ dateISO = todayISO() } = {}) {
  const id = uuid()
  const row = {
    id,
    user_id: null,
    mode: "practice",
    date_iso: dateISO,
    started_at: nowISO(),
    ended_at: null,
    status: "active",
    _dirty: true,
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
  s.ended_at = nowISO()
  s.status = "ended"
  s._dirty = true
  await set(id, s, st.practice.sessions)
  notifyLocalMutate()
  return s
}

export async function listPracticeSessions() {
  const ids = await readIndex(st.practice.sessions)
  const rows = []
  for (const id of ids) {
    const row = await get(id, st.practice.sessions)
    if (row) rows.push(row)
  }
  rows.sort((a, b) => (b.started_at || "").localeCompare(a.started_at || ""))
  return rows
}

// ---- Entries & Markers ----
export async function addEntry({
  sessionId,
  zoneId,
  shotType,
  pressured = false,
  attempts = 0,
  makes = 0,
  ts = nowISO(),
}) {
  const id = uuid()
  const row = {
    id,
    user_id: null,
    mode: "practice",
    session_id: sessionId,
    zone_id: zoneId,
    shot_type: shotType,
    pressured: !!pressured,
    attempts: Number(attempts),
    makes: Number(makes),
    ts,
    _dirty: true,
    _table: "practice_entries",
  }
  await set(id, row, st.practice.entries)
  await addToIndex(st.practice.entries, id)
  notifyLocalMutate()
  return row
}

export async function addMarker({ sessionId, label = "", ts = nowISO() }) {
  const id = uuid()
  const row = {
    id,
    user_id: null,
    mode: "practice",
    session_id: sessionId,
    label,
    ts,
    _dirty: true,
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
    if (!e) continue

    const s = await get(e.session_id, st.practice.sessions)
    if (!s || s.date_iso !== today) continue

    const a = Number(e.attempts || 0)
    const m = Number(e.makes || 0)
    attempts += a
    makes += m

    if (ZONE_IS_THREE[e.zone_id]) {
      threesAttempts += a
      threesMakes += m
    }
  }

  const fg  = attempts ? makes / attempts : 0
  const efg = attempts ? (makes + 0.5 * threesMakes) / attempts : 0
  return { date: today, attempts, makes, fg, efg, threesAttempts, threesMakes }
}

// ---- Optional cleanup ----
export async function deletePracticeSession(id) {
  // remove child entries
  for (const eid of await readIndex(st.practice.entries)) {
    const e = await get(eid, st.practice.entries)
    if (e?.session_id === id) {
      await del(eid, st.practice.entries)
      await removeFromIndex(st.practice.entries, eid)
    }
  }
  // remove child markers
  for (const mid of await readIndex(st.practice.markers)) {
    const m = await get(mid, st.practice.markers)
    if (m?.session_id === id) {
      await del(mid, st.practice.markers)
      await removeFromIndex(st.practice.markers, mid)
    }
  }
  // remove session
  await del(id, st.practice.sessions)
  await removeFromIndex(st.practice.sessions, id)
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
  const store =
    row._table === "practice_sessions" ? st.practice.sessions :
    row._table === "practice_entries"  ? st.practice.entries  :
    row._table === "practice_markers"  ? st.practice.markers  : null
  if (!store) return
  row._dirty = false
  await set(row.id, row, store)
}

export async function listActivePracticeSessions() {
  const all = await listPracticeSessions()
  return all
    .filter(s => s?.status === "active" && !s?.ended_at)
    .sort((a,b) => (b.started_at || "").localeCompare(a.started_at || ""))
}

// List entries for a given practice session, oldest→newest
export async function listEntriesBySession(sessionId) {
  const ids = await readIndex(st.practice.entries)
  const rows = []
  for (const id of ids) {
    const e = await get(id, st.practice.entries)
    if (e?.session_id === sessionId) rows.push(e)
  }
  rows.sort((a,b) => (a.ts || "").localeCompare(b.ts || ""))
  return rows
}
