import { useEffect, useMemo, useState } from "react"

import {
  getActiveGameSession,
  listGameSessions,
} from "../lib/game-db"

export function useGameGateData() {
  const [sessions, setSessions] = useState([])
  const [active, setActive] = useState(null)

  const refresh = async () => {
    const [allSessions, currentSession] = await Promise.all([
      listGameSessions(),
      getActiveGameSession(),
    ])
    setSessions(allSessions || [])
    setActive(currentSession || null)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const previous = useMemo(
    () => (sessions || []).filter((session) => session.status === "completed"),
    [sessions],
  )

  const groupedPrev = useMemo(() => {
    const groups = new Map()
    for (const session of previous) {
      const key = session.level || "Games"
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(session)
    }
    for (const rows of groups.values()) {
      rows.sort((a, b) =>
        (b.date_iso || b.started_at || "").localeCompare(
          a.date_iso || a.started_at || "",
        ),
      )
    }
    return groups
  }, [previous])

  return {
    sessions,
    active,
    previous,
    groupedPrev,
    refresh,
  }
}
