// src/lib/game-db.js
import { createStore, get, set, del, keys } from "idb-keyval"
import { uuid } from "./util-id"
import { notifyLocalMutate } from "./sync-notify"
import { whenIdbReady } from "./idb-init"

const ready = whenIdbReady()
const nowISO = () => new Date().toISOString()

export const st = {
  game: {
    sessions: createStore("game", "sessions"),
    events:   createStore("game", "events"),
  },
}

// --- helpers ---
function normalizeHomeAway(v) {
  if (v == null) return "Home"
  const s = String(v).trim().toLowerCase()
  if (s === "home" || s === "h") return "Home"
  if (s === "away" || s === "a") return "Away"
  return "Home"
}

// (optional utility) sweep any existing rows that have bad home_away
export async function fixBadHomeAway() {
  await ready
  const ks = await keys(st.game.sessions)
  for (const k of ks) {
    const row = await get(k, st.game.sessions)
    if (!row) continue
    const norm = normalizeHomeAway(row.home_away)
    if (row.home_away !== norm) {
      await set(k, { ...row, home_away: norm, _dirty: true, _table: "game_sessions" }, st.game.sessions)
    }
  }
  notifyLocalMutate()
}

/* -----------------------------
 * Sessions
 * ---------------------------*/

export async function listGameSessions() {
  await ready
  const allKeys = await keys(st.game.sessions)
  const rows = []
  for (const k of allKeys) {
    const row = await get(k, st.game.sessions)
    if (row) rows.push(row)
  }
  rows.sort((a, b) => (b.started_at || "").localeCompare(a.started_at || ""))
  return rows
}

export async function getGameSession(id) {
  await ready
  if (!id) return null
  return await get(id, st.game.sessions)
}

export async function getActiveGameSession() {
  await ready
  const all = await listGameSessions()
  return all.find(s => s?.status === "active" && !s?.ended_at) || null
}

export async function addGameSession(meta = {}) {
  await ready
  const id = uuid()
  const startedAt = nowISO()

  const homeAwayInput = meta.home_away ?? meta.homeAway ?? meta.homeOrAway

  const row = {
    id,
    status: "active",
    started_at: startedAt,
    ended_at: null,

    date_iso:      meta.date_iso      ?? startedAt.slice(0, 10),
    team_name:     meta.team_name     ?? meta.teamName     ?? "",
    opponent_name: meta.opponent_name ?? meta.opponentName ?? "",
    venue:         meta.venue         ?? null,
    level:         meta.level         ?? "High School",
    home_away: normalizeHomeAway(homeAwayInput),

    _dirty: true,
    _table: "game_sessions",
  }

  await set(id, row, st.game.sessions)
  notifyLocalMutate()
  return row
}

export async function endGameSession(id) {
  await ready
  const row = await getGameSession(id)
  if (!row) return null
  const updated = {
    ...row,
    status: "completed",
    ended_at: nowISO(),
    home_away: normalizeHomeAway(row.home_away),
    _dirty: true,
    _table: "game_sessions"
  }
  await set(id, updated, st.game.sessions)
  notifyLocalMutate()
  return updated
}

export async function deleteGameSession(id) {
  await ready
  try {
    const evKeys = await keys(st.game.events)
    for (const k of evKeys) {
      const ev = await get(k, st.game.events)
      if (ev?.game_id === id) await del(k, st.game.events)
    }
  } catch (err) {
    if (err?.name !== "NotFoundError") console.warn("[game-db] delete events warning:", err)
  }
  await del(id, st.game.sessions)
  notifyLocalMutate()
  return true
}

/* -----------------------------
 * Events
 * ---------------------------*/

export async function addGameEvent(input) {
  await ready

  const game_id   = input.game_id   ?? input.gameId
  const zone_id   = input.zone_id   ?? input.zoneId ?? null
  const shot_type = input.shot_type ?? input.shotType ?? null
  const is_three  = typeof input.is_three !== "undefined" ? input.is_three : (input.isThree ?? null)
  const made      = typeof input.made !== "undefined" ? input.made : null
  const type      = input.type
  const mode      = input.mode ?? "game"
  const user_id   = input.user_id ?? null

  if (!game_id) throw new Error("[game-db] addGameEvent: game_id is required")
  if (!type)    throw new Error("[game-db] addGameEvent: type is required")

  let tsISO
  if (typeof input.ts === "number") tsISO = new Date(input.ts).toISOString()
  else if (input.ts) tsISO = new Date(input.ts).toISOString()
  else tsISO = nowISO()

  const id = input.id ?? uuid()

  const row = {
    id,
    game_id,
    user_id,
    mode,
    type,
    zone_id,
    shot_type,
    is_three,
    made,
    ts: tsISO,
    _dirty: true,
    _table: "game_events",
  }

  await set(id, row, st.game.events)
  notifyLocalMutate()
  return row
}

export async function listGameEventsBySession(gameId) {
  await ready
  const out = []
  const allKeys = await keys(st.game.events)
  for (const k of allKeys) {
    const ev = await get(k, st.game.events)
    if (ev?.game_id === gameId) out.push(ev)
  }
  out.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  return out
}

/* -----------------------------
 * Dirty helpers used by sync layer
 * ---------------------------*/

export async function _allDirtyGame() {
  await ready
  const out = []
  // sessions
  {
    const ks = await keys(st.game.sessions)
    for (const k of ks) {
      const row = await get(k, st.game.sessions)
      if (row?._dirty) out.push(row)
    }
  }
  // events
  {
    const ks = await keys(st.game.events)
    for (const k of ks) {
      const row = await get(k, st.game.events)
      if (row?._dirty) out.push(row)
    }
  }
  return out
}

export async function _markClean(row) {
  await ready
  if (!row?._table) return
  if (row._table === "game_sessions") {
    const cur = await get(row.id, st.game.sessions)
    if (cur) { cur._dirty = false; await set(row.id, cur, st.game.sessions) }
  } else if (row._table === "game_events") {
    const cur = await get(row.id, st.game.events)
    if (cur) { cur._dirty = false; await set(row.id, cur, st.game.events) }
  }
}
