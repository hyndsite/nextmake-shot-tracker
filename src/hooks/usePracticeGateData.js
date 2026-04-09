import { useEffect, useMemo, useState } from "react"

import {
  listPracticeSessions,
  listActivePracticeSessions,
} from "../lib/practice-db"
import {
  listAthletes,
  getActiveAthleteId,
} from "../lib/athlete-db"

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

export function usePracticeGateData() {
  const [sessions, setSessions] = useState([])
  const [active, setActive] = useState(null)
  const [athletes, setAthletes] = useState(() => listAthletes())
  const [selectedAthleteId, setSelectedAthleteId] = useState(() => {
    const rows = listAthletes()
    return getActiveAthleteId() || rows[0]?.id || ""
  })

  const selectedAthlete = useMemo(
    () => athletes.find((row) => row.id === selectedAthleteId) ?? null,
    [athletes, selectedAthleteId],
  )

  const canStartForSelectedAthlete = Boolean(selectedAthleteId)

  const groupedMonths = useMemo(() => {
    const rows = sessions
      .filter((session) => !active || session.id !== active.id)
      .filter((session) => session.started_at || session.date_iso)

    if (!rows.length) return []

    const groups = new Map()
    for (const session of rows) {
      const base = session.started_at || session.date_iso
      const key = monthKey(base)
      const label = monthLabel(base)
      if (!groups.has(key)) {
        groups.set(key, { key, label, sessions: [] })
      }
      groups.get(key).sessions.push(session)
    }

    const months = Array.from(groups.values())
    months.sort((a, b) => b.key.localeCompare(a.key))
    for (const month of months) {
      month.sessions.sort((a, b) => {
        const da = a.started_at || a.date_iso || ""
        const db = b.started_at || b.date_iso || ""
        return db.localeCompare(da)
      })
    }
    return months
  }, [sessions, active])

  const refresh = async () => {
    const [allSessions, activeSessions] = await Promise.all([
      listPracticeSessions(),
      listActivePracticeSessions(),
    ])
    setSessions(allSessions)
    setActive(activeSessions[0] || null)
    const nextAthletes = listAthletes()
    setAthletes(nextAthletes)
    setSelectedAthleteId(getActiveAthleteId() || nextAthletes[0]?.id || "")
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
