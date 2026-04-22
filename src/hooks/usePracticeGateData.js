import { useEffect, useMemo, useState } from "react"

import {
  listPracticeSessions,
  listActivePracticeSessions,
} from "../lib/practice-db"
import {
  listAthletes,
  getActiveAthleteId,
} from "../lib/athlete-db"
import {
  getInitialSelectedAthleteId,
  groupPracticeSessionsByMonth,
} from "../lib/practice-gate"

export function usePracticeGateData() {
  const [sessions, setSessions] = useState([])
  const [active, setActive] = useState(null)
  const [athletes, setAthletes] = useState(() => listAthletes())
  const [selectedAthleteId, setSelectedAthleteId] = useState(() => {
    const rows = listAthletes()
    return getInitialSelectedAthleteId(rows, getActiveAthleteId())
  })

  const selectedAthlete = useMemo(
    () => athletes.find((row) => row.id === selectedAthleteId) ?? null,
    [athletes, selectedAthleteId],
  )

  const canStartForSelectedAthlete = Boolean(selectedAthleteId)

  const groupedMonths = useMemo(() => {
    return groupPracticeSessionsByMonth(sessions, active?.id)
  }, [sessions, active?.id])

  const refresh = async () => {
    const [allSessions, activeSessions] = await Promise.all([
      listPracticeSessions(),
      listActivePracticeSessions(),
    ])
    setSessions(allSessions)
    setActive(activeSessions[0] || null)
    const nextAthletes = listAthletes()
    setAthletes(nextAthletes)
    setSelectedAthleteId(
      getInitialSelectedAthleteId(nextAthletes, getActiveAthleteId()),
    )
  }

  useEffect(() => {
    void refresh()
  }, [])

  return {
    sessions,
    active,
    athletes,
    selectedAthleteId,
    setSelectedAthleteId,
    selectedAthlete,
    canStartForSelectedAthlete,
    groupedMonths,
    refresh,
  }
}
