import { useEffect, useMemo, useState } from "react"
import {
  addPracticeSession, 
  endPracticeSession, 
  listPracticeSessions,
  addEntry, 
  listEntriesBySession, 
  addMarker
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
  const [showConfirmStart, setShowConfirmStart] = useState(false)
  // ✅ use your real IDs
  const [zoneId, setZoneId] = useState(ZONE_OPTIONS[0]?.value || "")
  const [shotTypeId, setShotTypeId] = useState(SHOT_OPTIONS[0]?.value || "")
  const [pressured, setPressured] = useState(false)
  const [attempts, setAttempts] = useState(10)
  const [makes, setMakes] = useState(4)
  const [runningEFG, setRunningEFG] = useState(0)
  const [recentDrills, setRecentDrills] = useState([]) // list below drill section
   // ➕/➖ handlers for attempts & makes
  const dec = (setter) => setter(v => Math.max(0, Number(v||0) - 1))
  const inc = (setter) => setter(v => Number(v||0) + 1)
  const add5 = (setter) => setter(v => Number(v||0) + 5)
  const invalidCounts = makes > attempts || (attempts === 0 && makes === 0)
  const [runningMakes, setRunningMakes] = useState(0)
  const [runningAttempts, setRunningAttempts] = useState(0)

  // helper for 3PT lookup
  const ZONE_IS_THREE = useMemo(
    () => Object.fromEntries(ZONES.map(z => [z.id, !!z.isThree])),
    []
  )

  // 🔄 recompute running eFG% for the active session
  async function refreshEFG(sessionId) {
    if (!sessionId) {
      setRunningEFG(0)
      setRunningMakes(0)
      setRunningAttempts(0)
      return
    }
  
    const entries = await listEntriesBySession(sessionId)
    let A = 0, M = 0, TM = 0
    for (const e of entries) {
      const a = Number(e.attempts || 0)
      const m = Number(e.makes || 0)
      A += a
      M += m
      if (ZONE_IS_THREE[e.zone_id]) TM += m
    }
    const efg = A ? (M + 0.5 * TM) / A : 0
  
    setRunningEFG(efg)
    setRunningMakes(M)
    setRunningAttempts(A)
  
    // Also repopulate the recent drills list when loading/reloading the page
    setRecentDrills(
      entries.map(e => ({
        id: e.id,
        when: new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        zoneId: e.zone_id,
        shotType: e.shot_type,
        attempts: e.attempts,
        makes: e.makes,
      }))
    )
  }
  
  async function refresh() {
    const all = await listPracticeSessions()
    setSessions(all)
    // pick active (if any)
    const actives = all.filter(s => s?.status === "active" && !s?.ended_at)
    setActiveId(actives[0]?.id ?? null)
  }

  useEffect(() => { void refresh() }, [])
  // call refreshEFG whenever activeId changes or after a save
  useEffect(() => { if (activeId) void refreshEFG(activeId) }, [activeId])

  // 📝 Save & Mark Set: persist entry then marker, update running list + eFG
  async function onSaveAndMarkSet() {
    if (!activeSession?.id) return
    const a = Number(attempts||0)
    const m = Number(makes||0)
    if (a <= 0 && m <= 0) return // nothing to save

    const entry = await addEntry({
      sessionId: activeSession.id,
      zoneId,
      shotType: shotTypeId,
      pressured,
      attempts: a,
      makes: m,
      ts: new Date().toISOString()
    })

    await addMarker({ sessionId: activeSession.id, label: "Set" })

    // Append to local “recent drills” list shown under the section
    setRecentDrills(prev => [
      ...prev,
      {
        id: entry.id,
        when: new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        zoneId: entry.zone_id,
        shotType: entry.shot_type,
        attempts: entry.attempts,
        makes: entry.makes,
      }
    ])

    // reset inputs for next drill
    setAttempts(0)
    setMakes(0)

    // refresh running eFG
    await refreshEFG(activeSession.id)
  }
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
        <section className="my-2">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-600">Current Session eFG%</div>
              <div className="text-2xl font-bold text-slate-900">
                {isFinite(runningEFG) ? (runningEFG * 100).toFixed(1) : "0.0"}%
              </div>
            </div>
            <div className="text-right text-sm text-slate-600">
              <div>Total Shots: <span className="font-semibold text-slate-900">{runningAttempts}</span></div>
              <div>Total Makes: <span className="font-semibold text-slate-900">{runningMakes}</span></div>
            </div>
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

            {/* Attempts */}
            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Attempts</label>

              <div className="qty-row">
                <div className="qty-group">
                  <button type="button" onClick={() => dec(setAttempts)} className="btn btn-blue btn-xs">−</button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={attempts}
                    onChange={e => setAttempts(Math.max(0, Number(e.target.value || 0)))}
                    className="input-qty"
                  />
                  <button type="button" onClick={() => inc(setAttempts)} className="btn btn-blue btn-xs">+</button>
                  <button type="button" onClick={() => add5(setAttempts)} className="btn btn-blue btn-xs">+5</button>
                </div>
              </div>
            </div>

            {/* Makes */}
            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Makes</label>

              <div className="qty-row">
                <div className="qty-group">
                  <button type="button" onClick={() => dec(setMakes)} className="btn btn-blue btn-xs">−</button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={makes}
                    onChange={e => setMakes(Math.max(0, Number(e.target.value || 0)))}
                    className="input-qty"
                  />
                  <button type="button" onClick={() => inc(setMakes)} className="btn btn-blue btn-xs">+</button>
                  <button type="button" onClick={() => add5(setMakes)} className="btn btn-blue btn-xs">+5</button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onSaveAndMarkSet}
                disabled={!activeSession || invalidCounts}
                className="btn btn-emerald h-10 rounded-lg text-sm font-medium"
              >
                Save &amp; Mark Set
              </button>
            </div>
          </div>
        </section>

        {recentDrills.length > 0 && (
        <section className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-sm font-semibold text-slate-900 mb-2">This Session – Logged Drills</div>
          <ul className="space-y-2">
            {recentDrills.map(d => (
              <li key={d.id} className="flex items-center justify-between text-sm">
                <div className="flex flex-col">
                  <span className="text-slate-900">{d.shotType} • {d.zoneId}</span>
                  <span className="text-slate-500">{d.when}</span>
                </div>
                <div className="font-medium text-slate-900">{d.makes}/{d.attempts}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
      </main>
    </div>
  )
}
