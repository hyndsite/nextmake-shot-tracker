import { useEffect, useMemo, useState } from "react"

import {
  getActiveGameSession,
  listGameSessions,
} from "../lib/game-db"
import {
  groupPreviousGamesByLevel,
  listPreviousGameSessions,
} from "../lib/game-gate"

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
    () => listPreviousGameSessions(sessions),
    [sessions],
  )

  const groupedPrev = useMemo(() => {
    return groupPreviousGamesByLevel(previous)
  }, [previous])

  return {
    sessions,
    active,
    previous,
    groupedPrev,
    refresh,
  }
}
