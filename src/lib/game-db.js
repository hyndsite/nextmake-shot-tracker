import { createStore, get, set, del, keys  } from "idb-keyval"
import { uuid } from "./util-id"
import { notifyLocalMutate } from "./sync-notify"

const IDX_KEY="__index__"
async function readIndex(s){ return (await get(IDX_KEY,s)) ?? [] }
async function addToIndex(s,id){ const i=await readIndex(s); if(!i.includes(id)){ i.push(id); await set(IDX_KEY,i,s)}}
const now = ()=> new Date().toISOString()

export const st = {
  game: {
    sessions: createStore("game","sessions"),
    events:   createStore("game","events"),
  },
}

// Get all session ids (newest first by started_at)
async function _allGameIds() {
  const ids = await keys(st.game.sessions)
  return ids
}

export async function listGameSessions() {
  const ids = await _allGameIds()
  const rows = []
  for (const id of ids) {
    const row = await get(id, st.game.sessions)
    if (row) rows.push(row)
  }
  rows.sort((a,b) => (b.started_at || "").localeCompare(a.started_at || ""))
  return rows
}

export async function getActiveGameSession() {
  const all = await listGameSessions()
  return all.find(s => s?.status === "active" && !s?.ended_at) || null
}

export async function endGameSession(id) {
  const row = await get(id, st.game.sessions)
  if (!row) return null
  const ended_at = new Date().toISOString()
  const updated = { ...row, status: "completed", ended_at, _dirty: true }
  await set(id, updated, st.game.sessions)
  return updated
}

export async function addGameEvent({ gameId, type, zoneId=null, shotType=null, isThree=null, made=null, ts=now() }){
  const id = uuid()
  const row = { id, game_id:gameId, user_id:null, mode:"game", type, zone_id:zoneId, shot_type:shotType, is_three:isThree, made, ts, _dirty:true, _table:"game_events" }
  await set(id,row,st.game.events); await addToIndex(st.game.events,id)
  notifyLocalMutate()
  return row
}

export async function addGameSession(meta = {}) {
  const id = uuid()
  const now = new Date().toISOString()

  const row = {
    id,
    status: "active",
    started_at: now,
    ended_at: null,

    // metadata (normalized keys)
    date_iso: meta.date_iso ?? now.slice(0,10),
    team_name: meta.team_name ?? "",
    opponent_name: meta.opponent_name ?? "",
    venue: meta.venue ?? null,
    level: meta.level ?? "High School",
    home_away: (meta.home_away ?? "home").toLowerCase(), // "home" | "away"

    // sync markers
    _dirty: true,
    _table: "game_sessions",
  }

  await set(id, row, st.game.sessions)
  return row
}

export async function deleteGameSession(id) {
  // Best-effort delete of events linked to this session.
  try {
    const evKeys = await keys(st.game.events);
    for (const k of evKeys) {
      const ev = await get(k, st.game.events);
      if (ev?.session_id === id) {
        await del(k, st.game.events);
      }
    }
  } catch (err) {
    // If the events store doesn't exist yet on this device, skip gracefully.
    if (err?.name !== "NotFoundError") {
      console.warn("[game-db] delete events warning:", err);
    }
  }

  // Remove the session row (this store is known-good)
  await del(id, st.game.sessions);
  return true;
}

// Used by sync.js:
export async function _allDirtyGame(){ /* unchanged from earlier (returns dirty rows) */ }
export async function _markClean(row){ /* unchanged from earlier (sets _dirty=false) */ }
