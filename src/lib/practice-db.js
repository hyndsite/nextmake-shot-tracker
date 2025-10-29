import { createStore, get, set } from "idb-keyval"
import { nanoid } from "./util-id"
import { notifyLocalMutate } from "./sync-notify"

export const st = {
  practice: {
    sessions: createStore("practice", "sessions"),
    entries:  createStore("practice", "entries"),
    markers:  createStore("practice", "markers"),
  }
}
const IDX_KEY="__index__"
async function readIndex(s){ return (await get(IDX_KEY, s)) ?? [] }
async function addToIndex(s,id){ const i=await readIndex(s); if(!i.includes(id)){ i.push(id); await set(IDX_KEY,i,s)}}

const today = () => new Date().toISOString().slice(0,10)
const now   = () => new Date().toISOString()

export async function addPracticeSession({ dateISO = today() } = {}){
  const id = nanoid()
  const row = { id, mode:"practice", date_iso:dateISO, started_at:now(), ended_at:null, status:"active", _dirty:true, _table:"practice_sessions" }
  await set(id, row, st.practice.sessions); await addToIndex(st.practice.sessions, id)
  notifyLocalMutate() // <-- triggers auto-sync scheduler
  return row
}

export async function endPracticeSession(id){
  const s = await get(id, st.practice.sessions); if(!s) return null
  s.ended_at = now(); s.status="ended"; s._dirty = true
  await set(id, s, st.practice.sessions)
  notifyLocalMutate()
  return s
}

export async function addEntry({ sessionId, zoneId, shotType, pressured=false, attempts=0, makes=0, ts=now() }){
  const id = nanoid()
  const row = { id, session_id:sessionId, user_id:null, mode:"practice", zone_id:zoneId, shot_type:shotType, pressured:!!pressured, attempts:+attempts, makes:+makes, ts, _dirty:true, _table:"practice_entries" }
  await set(id, row, st.practice.entries); await addToIndex(st.practice.entries, id)
  notifyLocalMutate()
  return row
}

export async function addMarker({ sessionId, label, ts=now() }){
  const id = nanoid()
  const row = { id, session_id:sessionId, user_id:null, mode:"practice", label:label??"", ts, _dirty:true, _table:"practice_markers" }
  await set(id, row, st.practice.markers); await addToIndex(st.practice.markers, id)
  notifyLocalMutate()
  return row
}

/* ... keep your list/summary helpers ... */

// Used by sync.js:
export async function _allDirtyPractice(){
  const bucket=[]; for(const store of [st.practice.sessions, st.practice.entries, st.practice.markers]){
    const ids = (await get("__index__", store)) ?? []
    for(const id of ids){ const row = await get(id, store); if(row?._dirty) bucket.push(row) }
  } return bucket
}
export async function _markClean(row){
  const store = row._table==="practice_sessions" ? st.practice.sessions :
                row._table==="practice_entries"  ? st.practice.entries  : st.practice.markers
  row._dirty = false; await set(row.id, row, store)
}
