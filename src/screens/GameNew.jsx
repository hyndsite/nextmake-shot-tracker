import React, { useMemo, useState } from "react"
import { addGameSession } from "../lib/game-db"
import {LEVELS } from "../constants/programLevel"     // <- ensure this file exists per our constants step
import { HOME_AWAY } from "../constants/homeAway" // <- Home/Away dropdown options
import { ArrowLeft } from "lucide-react"
import {
  getActiveAthleteId,
  listAthletes,
  setActiveAthlete,
} from "../lib/athlete-db"

function athleteName(athlete) {
  if (!athlete) return "Unknown athlete"
  return `${athlete.first_name}${athlete.last_name ? ` ${athlete.last_name}` : ""}`
}

export default function GameNew({ navigate }) {
  // Defaults
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const athletes = useMemo(() => listAthletes(), [])
  const [athleteId, setAthleteId] = useState(() =>
    getActiveAthleteId() || athletes[0]?.id || ""
  )
  const [dateISO, setDateISO]   = useState(todayISO)
  const [teamName, setTeamName] = useState("")
  const [opponent, setOpponent] = useState("")
  const [venue, setVenue]       = useState("")
  const [level, setLevel]       = useState("High School")
  const [homeAway, setHomeAway] = useState("Home")
  const [saving, setSaving]     = useState(false)
  const [pendingAthleteId, setPendingAthleteId] = useState("")
  const selectedAthlete = useMemo(
    () => athletes.find((row) => row.id === athleteId) ?? null,
    [athletes, athleteId]
  )
  const pendingAthlete = useMemo(
    () => athletes.find((row) => row.id === pendingAthleteId) ?? null,
    [athletes, pendingAthleteId]
  )
  

  function invalidReason() {
    if (!athleteId)        return "Select an athlete profile first."
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
      setActiveAthlete(athleteId)
      const row = await addGameSession({
        athlete_id: athleteId,
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

  function onAthleteSelectChange(nextId) {
    if (!nextId || nextId === athleteId) return
    setPendingAthleteId(nextId)
  }

  function confirmAthleteChange() {
    if (!pendingAthleteId) return
    setAthleteId(pendingAthleteId)
    setActiveAthlete(pendingAthleteId)
    setPendingAthleteId("")
  }

  function cancelAthleteChange() {
    setPendingAthleteId("")
  }

  return (
    <div className="page">
      <div className="flex items-center mb-3">
        <button
          type="button"
          onClick={() => navigate?.("gate")} // or setActiveTab('game') if using your App tab state
          className="flex items-center gap-1 border border-sky-600 text-sky-700 px-3 py-1.5 rounded-lg bg-white hover:bg-sky-50 active:scale-[0.98] shadow-sm"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>
      <h1 className="screen-title">New Game</h1>

      <section className="section space-y-4">
        <div
          data-testid="athlete-start-row"
          className="flex items-start gap-3"
        >
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-slate-700 mb-1">Athlete</label>
            <select
              value={athleteId}
              onChange={e => onAthleteSelectChange(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
            >
              {athletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athleteName(athlete)}
                </option>
              ))}
            </select>
            {!athletes.length && (
              <p className="mt-1 text-xs text-red-600">
                No athlete profiles found. Add one from Dashboard first.
              </p>
            )}
          </div>
        </div>

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

        <button
          type="button"
          onClick={startGame}
          disabled={saving}
          className="btn btn-emerald w-full h-11 rounded-xl text-base font-semibold"
        >
          {saving ? "Starting…" : "Start Game"}
        </button>

      </section>

      {pendingAthlete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm athlete change"
        >
          <div className="w-[92%] max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">
              Change active athlete?
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Switch to {athleteName(pendingAthlete)} for this game?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelAthleteChange}
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAthleteChange}
                className="btn btn-blue h-9 px-3 rounded-lg text-sm font-semibold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
