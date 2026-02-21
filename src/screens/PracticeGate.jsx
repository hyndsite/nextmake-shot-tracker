// src/screens/PracticeGate.jsx
import { useEffect, useMemo, useRef, useState } from "react"
import {
  addPracticeSession,
  deletePracticeSession,
  listPracticeSessions,
  listActivePracticeSessions,
} from "../lib/practice-db"
import { PlayCircle, Trash2, ChevronDown, ArrowLeftRight } from "lucide-react"
import {
  listAthletes,
  getActiveAthleteId,
  setActiveAthlete,
} from "../lib/athlete-db"

function athleteName(athlete) {
  if (!athlete) return "No active athlete"
  return `${athlete.first_name}${athlete.last_name ? ` ${athlete.last_name}` : ""}`
}

function Avatar({ athlete }) {
  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold text-slate-800 shrink-0"
      style={{ backgroundColor: athlete?.avatar_color || "#E2E8F0" }}
      aria-hidden="true"
    >
      {athlete?.initials || "NA"}
    </div>
  )
}

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString() } catch { return iso || "—" }
}

function dayName(iso) {
  try { return new Date(iso).toLocaleDateString(undefined, { weekday: "long" }) } catch { return "—" }
}

function monthKey(iso) {
  try {
    const d = new Date(iso || Date.now())
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  } catch {
    return "0000-00"
  }
}

function monthLabel(iso) {
  try {
    const d = new Date(iso || Date.now())
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" })
  } catch {
    return "Unknown"
  }
}

export default function PracticeGate({ navigate }) {
  const [sessions, setSessions] = useState([])
  const [active, setActive] = useState(null)
  const [existingActiveSession, setExistingActiveSession] = useState(null)
  const [openMonth, setOpenMonth] = useState(null)
  const [athletes, setAthletes] = useState(() => listAthletes())
  const [selectedAthleteId, setSelectedAthleteId] = useState(() => {
    const rows = listAthletes()
    return getActiveAthleteId() || rows[0]?.id || ""
  })
  const [showStartCard, setShowStartCard] = useState(false)
  const [showSwitchAthlete, setShowSwitchAthlete] = useState(false)
  const chooserRef = useRef(null)

  const selectedAthlete = useMemo(
    () => athletes.find((row) => row.id === selectedAthleteId) ?? null,
    [athletes, selectedAthleteId]
  )
  const canStartForSelectedAthlete = Boolean(selectedAthleteId)

  const groupedMonths = useMemo(() => {
    const rows = sessions
      // don't show the current active session in "Previous"
      .filter(s => !active || s.id !== active.id)
      .filter(s => s.started_at || s.date_iso)

    if (!rows.length) return []

    const map = new Map()
    for (const s of rows) {
      const base = s.started_at || s.date_iso
      const key = monthKey(base)
      const label = monthLabel(base)
      if (!map.has(key)) {
        map.set(key, { key, label, sessions: [] })
      }
      map.get(key).sessions.push(s)
    }

    const months = Array.from(map.values())
    // Months in descending order
    months.sort((a, b) => b.key.localeCompare(a.key))
    // Sessions within each month in descending order
    for (const m of months) {
      m.sessions.sort((a, b) => {
        const da = a.started_at || a.date_iso || ""
        const db = b.started_at || b.date_iso || ""
        return db.localeCompare(da)
      })
    }
    return months
  }, [sessions, active])

  async function refresh() {
    const all = await listPracticeSessions()
    const actives = await listActivePracticeSessions()
    setSessions(all)
    setActive(actives[0] || null)
    const nextAthletes = listAthletes()
    setAthletes(nextAthletes)
    setSelectedAthleteId(getActiveAthleteId() || nextAthletes[0]?.id || "")
  }
  useEffect(() => { refresh() }, [])

  useEffect(() => {
    if (!showStartCard) return undefined

    function onPointerDown(event) {
      if (chooserRef.current?.contains(event.target)) return
      setShowStartCard(false)
      setShowSwitchAthlete(false)
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
    }
  }, [showStartCard])

  // Actions
  const startNew = async () => {
    setShowStartCard(true)
    setShowSwitchAthlete(false)
  }

  const startForSelectedAthlete = async () => {
    if (!selectedAthleteId) return
    setActiveAthlete(selectedAthleteId)
    const activeForSelectedAthlete = await listActivePracticeSessions()
    if (activeForSelectedAthlete.length > 0) {
      setExistingActiveSession(activeForSelectedAthlete[0])
      return
    }
    const row = await addPracticeSession({ athlete_id: selectedAthleteId })
    setShowStartCard(false)
    setShowSwitchAthlete(false)
    await refresh()
    navigate?.("practice-log", { id: row.id, started_at: row.started_at })
  }

  const resumeExistingSession = () => {
    if (!existingActiveSession) return
    navigate?.("practice-log", {
      id: existingActiveSession.id,
      started_at: existingActiveSession.started_at,
    })
    setExistingActiveSession(null)
    setShowStartCard(false)
    setShowSwitchAthlete(false)
  }

  const resumeActive = () => {
    if (!active) return
    navigate?.("practice-log", { id: active.id, started_at: active.started_at })
  }

  const openSession = (id) => {
    const s = sessions.find(x => x.id === id)
    if (!s) return
    navigate?.("practice-log", { id: s.id, started_at: s.started_at })
  }

  const onDelete = async (id) => {
    await deletePracticeSession(id)
    await refresh()
  }

  return (
    <div className="page p-3 pb-20 max-w-screen-sm mx-auto">
      <h2 className="screen-title">Practice Sessions</h2>

      {/* Start New */}
      {!showStartCard && (
        <button
          type="button"
          onClick={startNew}
          className="w-full btn btn-blue h-11 rounded-xl font-semibold flex items-center justify-center gap-2 mb-2"
        >
          <PlayCircle size={18} /> Start New Session
        </button>
      )}

      {showStartCard && (
        <section ref={chooserRef} className="mb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-2xl border border-slate-300 bg-white p-[2px] shadow-sm">
              <div
                className="rounded-[14px] p-[2px]"
                style={{ backgroundColor: selectedAthlete?.avatar_color || "#CBD5E1" }}
              >
                <div className="rounded-xl bg-gradient-to-r from-white to-slate-50 px-3 py-2.5 flex items-center gap-3">
                  <Avatar athlete={selectedAthlete} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Active athlete
                    </div>
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {athleteName(selectedAthlete)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={startForSelectedAthlete}
              disabled={!canStartForSelectedAthlete}
              className={`h-10 w-10 p-0 rounded-full border-2 inline-flex items-center justify-center shadow-sm transition ${
                canStartForSelectedAthlete
                  ? "text-white hover:brightness-95"
                  : "text-slate-500 cursor-not-allowed"
              }`}
              style={
                canStartForSelectedAthlete
                  ? {
                    backgroundColor: "#059669",
                    borderColor: "#059669",
                    color: "#FFFFFF",
                    width: 40,
                    height: 40,
                    minWidth: 40,
                    minHeight: 40,
                    borderRadius: 9999,
                    padding: 0,
                  }
                  : {
                    backgroundColor: "#E2E8F0",
                    borderColor: "#CBD5E1",
                    color: "#64748B",
                    width: 40,
                    height: 40,
                    minWidth: 40,
                    minHeight: 40,
                    borderRadius: 9999,
                    padding: 0,
                  }
              }
              aria-label="Start session for active athlete"
              title="Start session"
            >
              <span
                className="inline-block"
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderLeft: canStartForSelectedAthlete ? "10px solid #FFFFFF" : "10px solid #64748B",
                  marginLeft: 2,
                }}
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={() => setShowSwitchAthlete((v) => !v)}
              className="h-10 px-3 rounded-xl border border-sky-300 bg-sky-50 text-sky-700 inline-flex items-center justify-center shadow-sm transition hover:bg-sky-100"
              aria-label="Switch athlete for session"
              title="Switch athlete"
            >
              <ArrowLeftRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            </button>
          </div>

          {!athletes.length && (
            <div className="text-sm text-slate-500 px-1 mt-2">
              No athlete profiles found. Add one from Dashboard first.
            </div>
          )}

          {showSwitchAthlete && (
            <div className="mt-2 space-y-2" aria-label="Athlete list">
              {athletes.map((athlete) => (
                <button
                  key={athlete.id}
                  type="button"
                  onClick={() => {
                    setSelectedAthleteId(athlete.id)
                    setActiveAthlete(athlete.id)
                    setShowSwitchAthlete(false)
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-medium ${
                    athlete.id === selectedAthleteId
                      ? "border-sky-600 bg-sky-50 text-sky-900"
                      : "border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  {athleteName(athlete)}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Resume Active */}
      <button
        type="button"
        onClick={resumeActive}
        disabled={!active}
        className={`w-full h-11 rounded-xl font-semibold flex items-center justify-center gap-2 mb-4
          ${active ? "btn btn-blue" : "btn btn-disabled"}`}
      >
        <PlayCircle size={18} /> Resume Active Session
      </button>

      <h2 className="text-lg font-semibold mb-2">Previous Sessions</h2>

      <div className="space-y-3">
        {groupedMonths.map((month) => (
          <div key={month.key} className="rounded-2xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setOpenMonth(openMonth === month.key ? null : month.key)}
              className="w-full flex items-center justify-between px-3 py-2 accordion-header"
            >
              <span className="text-sm font-semibold text-slate-900">
                {month.label}
              </span>
              <ChevronDown
                size={18}
                className={`transition-transform ${openMonth === month.key ? "rotate-180" : ""}`}
              />
            </button>

            {openMonth === month.key && (
              <div className="border-t border-slate-100 p-2 space-y-2">
                {month.sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white practice-session-row"
                  >
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => openSession(s.id)}
                      aria-label="Open session"
                    >
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {dayName(s.started_at || s.date_iso)} |{" "}
                        <span className="text-slate-500">
                          {fmtDate(s.started_at || s.date_iso)}
                        </span>
                      </div>
                    </button>
                    <button
                      className="p-1.5 trash-btn"
                      onClick={() => onDelete(s.id)}
                      aria-label="Delete session"
                      title="Delete session"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {groupedMonths.length === 0 && (
          <div className="text-sm text-slate-500">No previous sessions yet.</div>
        )}
      </div>

      {/* Existing active session modal */}
      {existingActiveSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[90%] max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <div className="text-base font-semibold mb-1">Active Session Found</div>
            <p className="text-sm text-slate-600 mb-4">
              This athlete already has an active session. Please resume that session instead of starting a new one.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn btn-blue" onClick={() => setExistingActiveSession(null)}>Cancel</button>
              <button className="btn btn-emerald" onClick={resumeExistingSession}>Resume Existing Session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
