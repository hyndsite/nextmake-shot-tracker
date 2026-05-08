import { useState } from "react"

import {
  deleteGameSession,
  endGameSession,
} from "../lib/game-db"
import { useGameGateData } from "./useGameGateData"

function computeResultSummary(session) {
  const ts = session.team_score
  const os = session.opponent_score
  if (ts == null || os == null) return null

  const team = Number(ts)
  const opp = Number(os)
  if (!Number.isFinite(team) || !Number.isFinite(opp)) return null

  let letter = ""
  if (team > opp) letter = "W"
  else if (team < opp) letter = "L"
  else letter = "T"

  return { letter, team, opp }
}

function fmtDate(iso) {
  try {
    return new Date(iso || Date.now()).toLocaleDateString()
  } catch {
    return iso || ""
  }
}

function homeAwayPill(session) {
  const ha = (session.home_away || "").toLowerCase() === "home" ? "Home" : "Away"
  const isHome = ha === "Home"

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
        ${
          isHome
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-700"
        }`}
    >
      {ha}
    </span>
  )
}

export function useGameGateScreen({ navigate }) {
  const [showConfirmNew, setShowConfirmNew] = useState(false)
  const [pendingDeleteGameId, setPendingDeleteGameId] = useState(null)
  const {
    sessions,
    active,
    groupedPrev,
    refresh,
  } = useGameGateData()

  function startNew() {
    if (active) {
      setShowConfirmNew(true)
      return
    }
    navigate?.("game-new")
  }

  async function confirmEndAndStart() {
    if (active) await endGameSession(active.id)
    setShowConfirmNew(false)
    navigate?.("game-new")
  }

  function dismissConfirmNew() {
    setShowConfirmNew(false)
  }

  function resumeActive() {
    if (!active) return
    navigate?.("game-logger", { id: active.id })
  }

  function openDetail(id) {
    navigate?.("gameDetail", { id })
  }

  function requestDeleteGame(id, event) {
    event?.stopPropagation()
    setPendingDeleteGameId(id)
  }

  function dismissDeleteGame() {
    setPendingDeleteGameId(null)
  }

  async function confirmDeleteGame() {
    if (!pendingDeleteGameId) return
    const gameId = pendingDeleteGameId
    setPendingDeleteGameId(null)
    try {
      await deleteGameSession(gameId)
      await refresh()
    } catch (err) {
      console.warn("[GameGate] delete failed:", err)
      alert("Could not delete game on this device.")
    }
  }

  const pendingDeleteGame =
    sessions.find((session) => session.id === pendingDeleteGameId) || null
  const pendingDeleteGameLabel = pendingDeleteGame
    ? `${pendingDeleteGame.team_name || "Game"} vs ${pendingDeleteGame.opponent_name || "Opponent"} | ${fmtDate(
        pendingDeleteGame.started_at || pendingDeleteGame.date_iso,
      )}`
    : null

  return {
    data: {
      sessions,
      active,
      groupedPrev,
    },
    startUi: {
      showConfirmNew,
    },
    modal: {
      pendingDeleteGameId,
      pendingDeleteGameLabel,
    },
    display: {
      computeResultSummary,
      fmtDate,
      homeAwayPill,
    },
    startActions: {
      startNew,
      resumeActive,
    },
    modalActions: {
      confirmEndAndStart,
      dismissConfirmNew,
      confirmDeleteGame,
      dismissDeleteGame,
    },
    historyActions: {
      openDetail,
      requestDeleteGame,
    },
  }
}
