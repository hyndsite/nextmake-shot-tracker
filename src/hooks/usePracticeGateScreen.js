import { useEffect, useRef, useState } from "react"

import {
  addPracticeSession,
  deletePracticeSession,
  listActivePracticeSessions,
} from "../lib/practice-db"
import { setActiveAthlete } from "../lib/athlete-db"
import { usePracticeGateData } from "./usePracticeGateData"

export function usePracticeGateScreen({ navigate }) {
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

  const [existingActiveSession, setExistingActiveSession] = useState(null)
  const [openMonth, setOpenMonth] = useState(null)
  const [showStartCard, setShowStartCard] = useState(false)
  const [showSwitchAthlete, setShowSwitchAthlete] = useState(false)

  function dismissStartCard() {
    setShowStartCard(false)
    setShowSwitchAthlete(false)
  }

  useEffect(() => {
    if (!showStartCard) return undefined

    function onPointerDown(event) {
      if (chooserRef.current?.contains(event.target)) return
      dismissStartCard()
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
    }
  }, [showStartCard])

  function openStartCard() {
    setShowStartCard(true)
    setShowSwitchAthlete(false)
  }

  function toggleSwitchAthlete() {
    setShowSwitchAthlete((current) => !current)
  }

  function selectAthlete(id) {
    setSelectedAthleteId(id)
  }

  function selectSessionAthlete(id) {
    setSelectedAthleteId(id)
    setActiveAthlete(id)
    setShowSwitchAthlete(false)
  }

  async function startForSelectedAthlete() {
    if (!selectedAthleteId) return
    setActiveAthlete(selectedAthleteId)
    const activeForSelectedAthlete = await listActivePracticeSessions()
    if (activeForSelectedAthlete.length > 0) {
      setExistingActiveSession(activeForSelectedAthlete[0])
      return
    }
    const row = await addPracticeSession({ athlete_id: selectedAthleteId })
    dismissStartCard()
    await refresh()
    navigate?.("practice-log", { id: row.id, started_at: row.started_at })
  }

  function resumeExistingSession() {
    if (!existingActiveSession) return
    navigate?.("practice-log", {
      id: existingActiveSession.id,
      started_at: existingActiveSession.started_at,
    })
    setExistingActiveSession(null)
    dismissStartCard()
  }

  function dismissExistingSession() {
    setExistingActiveSession(null)
  }

  function resumeActive() {
    if (!active) return
    navigate?.("practice-log", { id: active.id, started_at: active.started_at })
  }

  function openSession(id) {
    const session = sessions.find((row) => row.id === id)
    if (!session) return
    navigate?.("practice-log", { id: session.id, started_at: session.started_at })
  }

  async function deleteSession(id) {
    await deletePracticeSession(id)
    await refresh()
  }

  function toggleMonth(key) {
    setOpenMonth((current) => (current === key ? null : key))
  }

  return {
    data: {
      sessions,
      active,
      athletes,
      selectedAthleteId,
      selectedAthlete,
      groupedMonths,
    },
    startUi: {
      chooserRef,
      showStartCard,
      showSwitchAthlete,
      canStartForSelectedAthlete,
    },
    historyUi: {
      openMonth,
    },
    modal: {
      existingActiveSession,
    },
    startActions: {
      openStartCard,
      dismissStartCard,
      toggleSwitchAthlete,
      selectAthlete,
      selectSessionAthlete,
      startForSelectedAthlete,
      resumeActive,
    },
    historyActions: {
      toggleMonth,
      setOpenMonth,
      openSession,
      deleteSession,
    },
    modalActions: {
      resumeExistingSession,
      dismissExistingSession,
    },
  }
}
