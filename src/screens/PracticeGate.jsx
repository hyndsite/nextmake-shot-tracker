// src/screens/PracticeGate.jsx
import { useEffect, useRef, useState } from "react"
import {
  addPracticeSession,
  deletePracticeSession,
  listActivePracticeSessions,
} from "../lib/practice-db"
import { PlayCircle } from "lucide-react"
import {
  setActiveAthlete,
} from "../lib/athlete-db"
import PracticeExistingSessionModal from "../components/PracticeExistingSessionModal"
import PracticeStartPanel from "../components/PracticeStartPanel"
import PracticeSessionHistory from "../components/PracticeSessionHistory"
import { usePracticeGateData } from "../hooks/usePracticeGateData"

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

      <PracticeSessionHistory
        groupedMonths={groupedMonths}
        openMonth={openMonth}
        setOpenMonth={setOpenMonth}
        openSession={openSession}
        onDelete={onDelete}
      />

      {/* Existing active session modal */}
      {existingActiveSession && (
        <PracticeExistingSessionModal
          onCancel={() => setExistingActiveSession(null)}
          onResume={resumeExistingSession}
        />
      )}
    </div>
  )
}
