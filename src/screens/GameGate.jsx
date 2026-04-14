// src/screens/GameGate.jsx
import { useState } from "react"
import { PlayCircle } from "lucide-react"
import {
  endGameSession,
  deleteGameSession,
} from "../lib/game-db"
import GameActiveSessionCard from "../components/GameActiveSessionCard"
import GameExistingSessionModal from "../components/GameExistingSessionModal"
import GameHistorySection from "../components/GameHistorySection"
import { useGameGateData } from "../hooks/useGameGateData"

export default function GameGate({ navigate }) {
  const [showConfirmNew, setShowConfirmNew] = useState(false)
  const { active, groupedPrev, refresh } = useGameGateData()

  // ---------- helpers ----------
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

  const fmtDate = (iso) => {
    try {
      return new Date(iso || Date.now()).toLocaleDateString()
    } catch {
      return iso || ""
    }
  }

  const homeAwayPill = (s) => {
    const ha = (s.home_away || "").toLowerCase() === "home" ? "Home" : "Away"
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

  // ---------- actions ----------
  const startNew = async () => {
    if (active) {
      setShowConfirmNew(true)
      return
    }
    navigate?.("game-new")
  }

  const confirmEndAndStart = async () => {
    if (active) await endGameSession(active.id)
    setShowConfirmNew(false)
    navigate?.("game-new")
  }

  const resumeActive = () => {
    if (!active) return
    navigate?.("game-logger", { id: active.id })
  }

  const openDetail = (id) => {
    navigate?.("gameDetail", { id })
  }

  async function onDelete(id, e) {
    e?.stopPropagation()
    const ok = window.confirm(
      "Delete this game and all its logged events?",
    )
    if (!ok) return
    try {
      await deleteGameSession(id)
      await refresh()
    } catch (err) {
      console.warn("[GameGate] delete failed:", err)
      alert("Could not delete game on this device.")
    }
  }

  // ---------- render ----------
  return (
    <div className="page">
      <h2 className="screen-title">Game Center</h2>

      {/* Start New Game — full width */}
      <button
        type="button"
        onClick={startNew}
        className="btn btn-blue w-full h-12 rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
      >
        <PlayCircle size={20} className="stroke-[2.25]" />
        Start New Game
      </button>

      {/* Resume card */}
      {active && (
        <GameActiveSessionCard
          activeGame={active}
          homeAwayPill={homeAwayPill}
          onResume={resumeActive}
        />
      )}

      <GameHistorySection
        groupedPrev={groupedPrev}
        computeResultSummary={computeResultSummary}
        fmtDate={fmtDate}
        homeAwayPill={homeAwayPill}
        openDetail={openDetail}
        onDelete={onDelete}
      />

      {/* Confirm new (active exists) */}
      {showConfirmNew && (
        <GameExistingSessionModal
          activeGame={active}
          fmtDate={fmtDate}
          onCancel={() => setShowConfirmNew(false)}
          onConfirm={confirmEndAndStart}
        />
      )}
    </div>
  )
}
