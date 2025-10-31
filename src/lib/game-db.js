import { createStore, get, set } from "idb-keyval"
import { uuid } from "./util-id"
import { notifyLocalMutate } from "./sync-notify"

export const st = { game:{ sessions:createStore("game","sessions"), events:createStore("game","events") } }
const IDX_KEY="__index__"
async function readIndex(s){ return (await get(IDX_KEY,s)) ?? [] }
async function addToIndex(s,id){ const i=await readIndex(s); if(!i.includes(id)){ i.push(id); await set(IDX_KEY,i,s)}}
const now = ()=> new Date().toISOString()

export async function addGameSession({ dateISO, yourTeam, opponent, venue="", level="High School", homeAway="Home" }){
  const id = uuid()
  const row = { id, mode:"game", date_iso: dateISO ?? now().slice(0,10), your_team:yourTeam??"", opponent:opponent??"", venue, level, home_away:homeAway, started_at:now(), ended_at:null, status:"active", _dirty:true, _table:"game_sessions" }
  await set(id,row,st.game.sessions); await addToIndex(st.game.sessions,id)
  notifyLocalMutate()
  return row
}

export async function endGameSession(id){
  const s = await get(id, st.game.sessions); if(!s) return null
  s.ended_at = now(); s.status="ended"; s._dirty=true
  await set(id, s, st.game.sessions)
  notifyLocalMutate()
  return s
}

export async function addGameEvent({ gameId, type, zoneId=null, shotType=null, isThree=null, made=null, ts=now() }){
  const id = uuid()
  const row = { id, game_id:gameId, user_id:null, mode:"game", type, zone_id:zoneId, shot_type:shotType, is_three:isThree, made, ts, _dirty:true, _table:"game_events" }
  await set(id,row,st.game.events); await addToIndex(st.game.events,id)
  notifyLocalMutate()
  return row
}

// Used by sync.js:
export async function _allDirtyGame(){ /* unchanged from earlier (returns dirty rows) */ }
export async function _markClean(row){ /* unchanged from earlier (sets _dirty=false) */ }
