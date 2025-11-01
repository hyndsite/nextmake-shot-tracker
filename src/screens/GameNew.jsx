import React, { useMemo, useState } from "react"
import { addGameSession } from "../lib/game-db"
import { LEVELS } from "../constants/programLevel"      // <- ensure this file exists per our constants step
import { HOME_AWAY } from "../constants/homeAway" // <- Home/Away dropdown options

export default function GameNew({ navigate }) {
  // Defaults
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [dateISO, setDateISO]   = useState(todayISO)
  const [teamName, setTeamName] = useState("")
  const [opponent, setOpponent] = useState("")
  const [venue, setVenue]       = useState("")
  const [level, setLevel]       = useState("High School")
  const [homeAway, setHomeAway] = useState("Home")
  const [saving, setSaving]     = useState(false)

  function invalidReason() {
    if (!teamName.trim()) return "Enter your team."
    if (!opponent.trim()) return "Enter the opponent."
    if (!dateISO)         return "Pick a date."
    return null
  }

  async function startGame() {
    const why = invalidReason()
    if (why) { alert(why); return }

    setSaving(true)
    try {
      const row = await addGameSession({
        date_iso: dateISO,
        team_name: teamName.trim(),
        opponent_name: opponent.trim(),
        venue: venue.trim() || null,
        level,                                  // e.g., "High School"
        home_away: homeAway.toLowerCase(),      // "home" | "away"
      })
      navigate?.("game-logger", { id: row.id })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h2 className="screen-title">New Game</h2>

      <section className="section space-y-4">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            type="date"
            value={dateISO}
            onChange={e => setDateISO(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
          />
        </div>

        {/* Your Team */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Your Team</label>
          <input
            type="text"
            placeholder="e.g., Panthers"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 placeholder-slate-400 text-slate-900"
          />
        </div>

        {/* Opponent */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Opponent</label>
          <input
            type="text"
            placeholder="e.g., Tigers"
            value={opponent}
            onChange={e => setOpponent(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 placeholder-slate-400 text-slate-900"
          />
        </div>

        {/* Venue */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Venue</label>
          <input
            type="text"
            placeholder="e.g., Main Gym"
            value={venue}
            onChange={e => setVenue(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 placeholder-slate-400 text-slate-900"
          />
        </div>

        {/* Level + Home/Away */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
            <select
              value={level}
              onChange={e => setLevel(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
            >
              {LEVELS.map(l => (
                <option key={l.key} value={l.label}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Home/Away</label>
            <select
              value={homeAway}
              onChange={e => setHomeAway(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
            >
              {HOME_AWAY.map(opt => (
                <option key={opt.key} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Start button (emerald) */}
        <div className="pt-1">
          <button
            type="button"
            onClick={startGame}
            disabled={saving}
            className="btn btn-emerald h-11 rounded-xl text-base font-semibold"
          >
            {saving ? "Starting…" : "Start Game"}
          </button>
        </div>
      </section>
    </div>
  )
}
