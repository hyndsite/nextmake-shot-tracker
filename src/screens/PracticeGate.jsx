// src/screens/PracticeGate.jsx
import { useEffect, useRef, useState } from "react"
import {
  addPracticeSession,
  deletePracticeSession,
  listActivePracticeSessions,
} from "../lib/practice-db"
import { PlayCircle, Trash2, ChevronDown } from "lucide-react"
import {
  setActiveAthlete,
} from "../lib/athlete-db"
import PracticeStartPanel from "../components/PracticeStartPanel"
import { usePracticeGateData } from "../hooks/usePracticeGateData"

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString() } catch { return iso || "—" }
}

function dayName(iso) {
  try { return new Date(iso).toLocaleDateString(undefined, { weekday: "long" }) } catch { return "—" }
}

export default function PracticeGate({ navigate }) {
  const [existingActiveSession, setExistingActiveSession] = useState(null)
  const [openMonth, setOpenMonth] = useState(null)
  const [showStartCard, setShowStartCard] = useState(false)
  const [showSwitchAthlete, setShowSwitchAthlete] = useState(false)
  const chooserRef = useRef(null)
  const {
    sessions,
    active,
    athletes,
    selectedAthleteId,
    setSelectedAthleteId,
    selectedAthlete,
    canStartForSelectedAthlete,
    groupedMonths,
    refresh,
  } = usePracticeGateData()

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
        <div ref={chooserRef}>
          <PracticeStartPanel
            selectedAthlete={selectedAthlete}
            athletes={athletes}
            selectedAthleteId={selectedAthleteId}
            canStartForSelectedAthlete={canStartForSelectedAthlete}
            showSwitchAthlete={showSwitchAthlete}
            setShowSwitchAthlete={setShowSwitchAthlete}
            startForSelectedAthlete={startForSelectedAthlete}
            setSelectedAthleteId={setSelectedAthleteId}
            setActiveAthlete={setActiveAthlete}
          />
        </div>
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
