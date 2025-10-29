// src/lib/sync.js
import { supabase } from "./supabase"
import { _allDirtyPractice, _markClean as markPracticeClean } from "./practice-db"
import { _allDirtyGame,     _markClean as markGameClean }     from "./game-db"
import { onLocalMutate } from "./sync-notify"

const LAST_SYNC_KEY = "nm_last_sync"
const setLastSync = (iso)=> localStorage.setItem(LAST_SYNC_KEY, iso)
const nowISO = () => new Date().toISOString()

let debounceTimer = null
let inFlight = false
let wantSync = false

async function currentUserId(){
  const { data, error } = await supabase.auth.getUser()
  if(error || !data?.user) return null
  return data.user.id
}

async function upsert(table, rows){
  if(!rows.length) return { error:null }
  const uid = await currentUserId()
  if(!uid) throw new Error("Not authenticated")
  const payload = rows.map(r => {
    const { _dirty, _table, ...clean } = r
    return { ...clean, user_id: uid }
  })
  return await supabase.from(table).upsert(payload, { onConflict: "id" })
}

async function pushAll(){
  const p = await _allDirtyPractice()
  const g = await _allDirtyGame()
  const by = {}
  for(const r of [...p, ...g]){ (by[r._table] ||= []).push(r) }

  const order = ["practice_sessions","practice_entries","practice_markers","game_sessions","game_events"]
  for(const t of order){
    const rows = by[t] || []
    if(!rows.length) continue
    const { error } = await upsert(t, rows)
    if(error) throw error
    for(const r of rows){ t.startsWith("practice") ? await markPracticeClean(r) : await markGameClean(r) }
  }
  setLastSync(nowISO())
  return p.length + g.length
}

async function doSync(){
  if(inFlight){ wantSync = true; return }
  if(!navigator.onLine){ wantSync = true; return }
  const uid = await currentUserId()
  if(!uid){ wantSync = true; return }

  inFlight = true
  try {
    const pushed = await pushAll()
    // (Optional) add pull logic if you add updated_at cols server-side
    // await pullAll()
  } finally {
    inFlight = false
    if(wantSync){ wantSync = false; queueSync(250) }
  }
}

function queueSync(ms=400){
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(doSync, ms)
}

export function initAutoSync(){
  // 1) Any local write → schedule a sync
  onLocalMutate(() => queueSync(250))

  // 2) Come online → sync
  window.addEventListener("online", () => queueSync(0))

  // 3) Auth changes → sync (new sessions need user_id)
  supabase.auth.onAuthStateChange(() => queueSync(0))

  // 4) Light periodic nudge
  setInterval(() => queueSync(2000), 60_000)

  // 5) Kick once on load if already online/authed
  queueSync(0)
}
