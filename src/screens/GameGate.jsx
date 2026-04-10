// src/screens/GameGate.jsx
import React, { useEffect, useMemo, useState } from "react"
import { PlayCircle } from "lucide-react"
import {
  endGameSession,
  deleteGameSession,
} from "../lib/game-db"
import GameHistorySection from "../components/GameHistorySection"
import { useGameGateData } from "../hooks/useGameGateData"

export default function GameGate({ navigate }) {
  const [showConfirmNew, setShowConfirmNew] = useState(false)
  const { sessions, active, groupedPrev, refresh } = useGameGateData()

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
        <section className="section mt-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <PlayCircle className="text-sky-600" size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-900 font-semibold">
                Resume Active Game
              </div>
              <div className="text-sm text-slate-600 truncate">
                {active.team_name} vs {active.opponent_name}
              </div>
              <div className="mt-1">{homeAwayPill(active)}</div>
            </div>
            <div className="shrink-0">
              <button
                type="button"
                onClick={resumeActive}
                className="btn btn-blue h-9 px-3 rounded-lg text-sm font-semibold"
              >
                Resume
              </button>
            </div>
          </div>
        </section>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[92%] max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <div className="text-base font-semibold mb-1">
              Active Game Detected
            </div>
            <p className="text-sm text-slate-600 mb-4">
              An active game session already exists:{" "}
              <span className="font-medium">{active?.team_name}</span> vs{" "}
              <span className="font-medium">{active?.opponent_name}</span> on{" "}
              {fmtDate(active?.started_at)}. Starting a new game will end
              the current one. Do you want to continue?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="btn btn-blue"
                onClick={() => setShowConfirmNew(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-emerald"
                onClick={confirmEndAndStart}
              >
                End &amp; Start New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
