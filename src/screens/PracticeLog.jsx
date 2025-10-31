import { useEffect, useMemo, useState } from "react"
import {
  addPracticeSession, endPracticeSession, listPracticeSessions, listActivePracticeSessions,
  addEntry, getTodaySummary
} from "../lib/practice-db"
import { ZONES } from "../constants/zones"
import { SHOT_TYPES } from "../constants/shotTypes"

const ZONE_OPTIONS = ZONES.map(z => ({ value: z.id, label: z.label }))
const SHOT_OPTIONS = SHOT_TYPES.map(s => ({ value: s.id, label: s.label }))

function fmtDT(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch { return iso || "—" }
}


export default function PracticeLog(){
  const [sessions, setSessions] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [today, setToday] = useState({ attempts:0, makes:0, fg:0, efg:0, threesAttempts:0, threesMakes:0 })
  const [showConfirmStart, setShowConfirmStart] = useState(false)
  // ✅ use your real IDs
  const [zoneId, setZoneId] = useState(ZONE_OPTIONS[0]?.value || "")
  const [shotTypeId, setShotTypeId] = useState(SHOT_OPTIONS[0]?.value || "")
  const [pressured, setPressured] = useState(false)
  const [attempts, setAttempts] = useState(10)
  const [makes, setMakes] = useState(4)

  const canSave = useMemo(
    ()=> !!activeId && attempts>=0 && makes>=0 && makes<=attempts,
    [activeId, attempts, makes]
  )

  
  async function refresh() {
    const all = await listPracticeSessions()
    setSessions(all)
    // pick active (if any)
    const actives = all.filter(s => s?.status === "active" && !s?.ended_at)
    setActiveId(actives[0]?.id ?? null)
  }
  useEffect(() => { void refresh() }, [])

  // Handlers
  async function onConfirmStartNew() {
    // End currently active first (if any), then start a new one
    if (activeSession) {
      await endPracticeSession(activeSession.id)
    }
    const row = await addPracticeSession({})
    await refresh()
    setActiveId(row.id)
    setShowConfirmStart(false)
  }

  function onStartNewClick() {
    // if an active exists, confirm; otherwise start immediately
    if (activeSession) {
      setShowConfirmStart(true)
    } else {
      void onConfirmStartNew()
    }
  }

  async function saveEntry({ keep=false } = {}){
    if(!canSave) return
    console.log("[PracticeLog] saveEntry() clicked")
    await addEntry({
      sessionId: activeId,
      zoneId,                 // ✅ store your zone id
      shotType: shotTypeId,   // ✅ store your shot type id
      pressured,
      attempts: Number(attempts),
      makes: Number(makes),
      ts: new Date().toISOString()
    })
    await refresh()
    console.log("[PracticeLog] saveEntry() logged")
    if(!keep){ setAttempts(10); setMakes(0) }
  }

  const activeSession = useMemo(
    () => sessions.find(s => s.id === activeId) || null,
    [sessions, activeId]
  )

  const activeList = useMemo(
    () => sessions.filter(s => s?.status === "active" && !s?.ended_at)
                  .sort((a,b)=> (b.started_at||"").localeCompare(a.started_at||"")),
    [sessions]
  )

  async function onEndActive() {
    if (!activeSession) return
    await endPracticeSession(activeSession.id)
    await refresh()
  }
  
  async function onSwitchActive(id) {
    // no DB write here—“active” is whichever session you operate on.
    // User must explicitly End to close it.
    setActiveId(id || null)
  }

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-screen-sm mx-auto px-4 py-3">
          <h2 className="screen-title text-left">Practice Sessions</h2>
          <p className="text-xs text-slate-500">Record drills quickly; save batches for analytics and goals.</p>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto p-4 space-y-3 pb-28">
        {/* Session controls */}
        <section className="card">
          <div className="flex flex-col gap-3">
            {/* Start new (emerald) */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={onStartNewClick}
                className="btn btn-emerald rounded-full shadow-sm"
                aria-label="Start new practice session for now"
              >
                Start New Practice Session
              </button>
            </div>

            {/* Active section */}
            <div className="flex flex-col gap-2">
              <div className="text-base font-semibold text-slate-900">Active Session</div>

              {/* If multiple actives (edge case), show a selector */}
              {activeList.length > 1 ? (
                <div className="flex items-center gap-2">
                  <select
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm flex-1"
                    value={activeId ?? ""}
                    onChange={e => onSwitchActive(e.target.value || null)}
                    aria-label="Switch active session"
                  >
                    {activeList.map(s => (
                      <option key={s.id} value={s.id}>
                        {fmtDT(s.started_at)} (Active)
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={onEndActive}
                    disabled={!activeSession}
                    className="btn btn-danger h-10 px-3 text-sm font-semibold shadow-sm"
                  >
                    End Session
                  </button>
                </div>
              ) : (
                // Single (or none)
                <div className="flex items-center gap-2">
                  <div className="text-sm text-slate-600 flex-1">
                    {activeSession
                      ? <>Active: <span className="font-medium">{fmtDT(activeSession.started_at)}</span></>
                      : <span className="text-slate-400">No active session</span>
                    }
                  </div>
                  <button
                    type="button"
                    onClick={onEndActive}
                    disabled={!activeSession}
                    className="btn btn-danger h-9 px-3 text-xs font-semibold shadow-sm"
                    aria-label="End active session"
                  >
                    End Session
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Confirm modal (inline, lightweight) */}
          {showConfirmStart && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="w-[90%] max-w-sm rounded-2xl bg-white p-4 shadow-xl">
                <div className="text-base font-semibold mb-1">Start New Session?</div>
                <p className="text-sm text-slate-600 mb-4">
                  You already have an active session. Starting a new one will end the current session and begin a new active session now.
                </p>
                <div className="flex justify-end gap-2">
                  <button className="btn btn-outline-emerald" onClick={()=>setShowConfirmStart(false)}>Cancel</button>
                  <button className="btn btn-emerald" onClick={()=>void onConfirmStartNew()}>End &amp; Start New</button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Today pill */}
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-sm">
            <span className="font-medium">Today:</span>{" "}
            eFG% <span className="font-semibold">{(today.efg*100).toFixed(1)}%</span>{" • "}
            Attempts <span className="font-semibold">{today.attempts}</span>{" • "}
            Makes <span className="font-semibold">{today.makes}</span>
          </div>
        </section>

        {/* Entry form */}
        <section className="card">
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Zone</label>
              <select className="input col-span-2" value={zoneId} onChange={e=>setZoneId(e.target.value)}>
                {ZONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Shot Type</label>
              <select className="input col-span-2" value={shotTypeId} onChange={e=>setShotTypeId(e.target.value)}>
                {SHOT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Pressured</label>
              <button
                type="button"
                onClick={() => setPressured(p => !p)}
                className={`btn h-10 rounded-lg text-sm font-medium ${
                  pressured ? "btn-emerald" : "btn-outline-emerald"
                }`}
              >
                {pressured ? "Contested" : "Uncontested"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Attempts</label>
              <input type="number" min="0" className="input col-span-2"
                value={attempts} onChange={e=>setAttempts(e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Makes</label>
              <input type="number" min="0" className="input col-span-2"
                value={makes} onChange={e=>setMakes(e.target.value)} />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={()=>saveEntry({ keep:true })} disabled={!canSave}
                className={`btn h-10 rounded-lg text-sm font-medium ${
                  canSave
                    ? "btn-outline-emerald"
                    : "bg-slate-100 text-slate-400 border-slate-200"
                }`}>
                Save &amp; Add Another
              </button>
              <button type="button" onClick={()=>saveEntry({ keep:false })} disabled={!canSave}
                className={`btn h-10 rounded-lg text-sm font-medium ${
                  canSave
                    ? "btn-emerald"
                    : "bg-slate-100 text-slate-400 border-slate-200"
                }`}>
                Save
              </button>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={()=>setAttempts(a=>Number(a||0)+10)}
              className="btn btn-blue h-12 rounded-xl"
            >
              +10 Attempts
            </button>

            <button
              onClick={()=>{
                setMakes(m=>Number(m||0)+1);
                setAttempts(a=>Number(a||0)+1);
              }}
              className="btn btn-blue h-12 rounded-xl"
            >
              +Make
            </button>

            <button type="button" className="btn btn-emerald h-12 rounded-xl">
              Mark Set
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
