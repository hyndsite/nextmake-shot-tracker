import React, { useEffect, useMemo, useState } from "react"
import { Plus, PlayCircle, Gamepad2, Trash2 } from "lucide-react"
import {
  listGameSessions,        // all sessions (active + completed), newest first
  getActiveGameSession,    // returns active game or null
  endGameSession,          // ends by id (sets ended_at + status:"completed")
} from "../lib/game-db"

/**
 * Props:
 * - navigate: (screen: string, params?: any) => void
 *    - "game-new"    -> GameNew.jsx
 *    - "game-logger" -> GameLogger.jsx (expects {id})
 *    - "game-detail" -> GameDetail.jsx (expects {id})
 */
export default function GameGate({ navigate }) {
  const [sessions, setSessions] = useState([])
  const [active, setActive] = useState(null)
  const [showConfirmNew, setShowConfirmNew] = useState(false)

  // ---- Load data -----------------------------------------------------------
  async function refresh() {
    const [all, current] = await Promise.all([
      listGameSessions(),
      getActiveGameSession()
    ])
    setSessions(all || [])
    setActive(current || null)
  }
  useEffect(() => { void refresh() }, [])

  // ---- Derived groups ------------------------------------------------------
  const previous = useMemo(
    () => (sessions || []).filter(s => s.status === "completed"),
    [sessions]
  )
  // Group by level (e.g., "High School", "Middle School") if available:
  const groupedPrev = useMemo(() => {
    const g = new Map()
    for (const s of previous) {
      const key = s.level || "Games"
      if (!g.has(key)) g.set(key, [])
      g.get(key).push(s)
    }
    // sort each group by date desc
    for (const arr of g.values()) {
      arr.sort((a,b) => (b.date_iso || b.started_at || "").localeCompare(a.date_iso || a.started_at || ""))
    }
    return g
  }, [previous])

  // ---- Handlers ------------------------------------------------------------
  const startNew = async () => {
    if (active) {
      setShowConfirmNew(true)
      return
    }
    navigate?.("game-new")
  }

  const confirmEndAndStart = async () => {
    if (active) {
      await endGameSession(active.id)
    }
    setShowConfirmNew(false)
    navigate?.("game-new")
  }

  const resumeActive = () => {
    if (!active) return
    navigate?.("game-logger", { id: active.id })
  }

  const openDetail = (id) => navigate?.("game-detail", { id })

  // ---- UI helpers ----------------------------------------------------------
  const fmtDate = (iso) => {
    try {
      return new Date(iso || Date.now()).toLocaleDateString()
    } catch { return iso || "" }
  }
  const homeAwayPill = (s) =>
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
                      ${s.home_away === "home"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-700"}`}>
      {s.home_away === "home" ? "Home" : "Away"}
    </span>

  // ---- Render --------------------------------------------------------------
  return (
    <div className="px-4 pt-3 pb-24 max-w-screen-sm mx-auto">
      {/* Header */}
      <div className="text-center mb-3">
        <h2 className="text-xl font-semibold text-slate-900">Game Center</h2>
      </div>

      {/* New Game button (blue, per wireframe) */}
      <button
        type="button"
        onClick={startNew}
        className="btn btn-blue w-full h-12 rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
      >
        <PlayCircle size={20} className="stroke-[2.25]" /> Start New Game
      </button>

      {/* Resume card (shown only when an active game exists) */}
      {active && (
        <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <PlayCircle className="text-sky-600" size={24} />
            </div>
            <div className="flex-1">
              <div className="text-slate-900 font-semibold">Resume Active Game</div>
              <div className="text-sm text-slate-600">
                Playing as {active.team_name} vs {active.opponent_name}
              </div>
              <div className="mt-1">{homeAwayPill(active)}</div>
            </div>
            <div>
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

      {/* Previous Games */}
      <h2 className="mt-5 text-slate-900 font-semibold">Previous Games</h2>

      {[...groupedPrev.entries()].map(([group, rows]) => (
        <section key={group} className="mt-2 space-y-2">
          {/* Optional group label; hide if it's just 'Games' */}
          {group !== "Games" && (
            <div className="text-xs uppercase tracking-wide text-slate-500 pl-1">{group}</div>
          )}
          {rows.map((g) => (
            <div
              key={g.id}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 flex items-center gap-3"
            >
              <div className="shrink-0 mt-0.5">
                <Gamepad2 size={18} className="text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500">{fmtDate(g.date_iso || g.started_at)}</div>
                <div className="truncate text-slate-900 font-medium">
                  {g.team_name} vs. {g.opponent_name}
                </div>
                <div className="mt-1">{homeAwayPill(g)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openDetail(g.id)}
                  className="text-sky-700 text-sm font-medium"
                >
                  View
                </button>
                {/* Optional delete icon – only wire if you implement deleteGameSession in game-db */}
                {/* <button className="text-red-500"><Trash2 size={18} /></button> */}
              </div>
            </div>
          ))}
        </section>
      ))}

      {/* Confirm modal for “New Game” while one is active */}
      {showConfirmNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[92%] max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <div className="text-base font-semibold mb-1">Active Game Detected</div>
            <p className="text-sm text-slate-600 mb-4">
              An active game session already exists:{" "}
              <span className="font-medium">{active?.team_name}</span> vs{" "}
              <span className="font-medium">{active?.opponent_name}</span>{" "}
              on {fmtDate(active?.started_at)}. Starting a new game will end the current one.
              Do you want to continue?
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn btn-blue" onClick={() => setShowConfirmNew(false)}>
                Cancel
              </button>
              <button className="btn btn-emerald" onClick={confirmEndAndStart}>
                End &amp; Start New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
