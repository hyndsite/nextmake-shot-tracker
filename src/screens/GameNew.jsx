import React, { useMemo, useState } from "react"
import { addGameSession } from "../lib/game-db"
import {
  AAU_COMPETITION_LEVEL_OPTIONS,
  AAU_SEASON_OPTIONS,
  formatGameLevelLabel,
  getCollegeSeasonOptions,
  K12_GRADE_OPTIONS,
  LEVEL_CATEGORY_OPTIONS,
} from "../constants/programLevel"
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
  const [levelCategory, setLevelCategory] = useState("k_12")
  const collegeSeasonOptions = useMemo(() => getCollegeSeasonOptions(new Date()), [])
  const [levelGrade, setLevelGrade] = useState("")
  const [collegeSeason, setCollegeSeason] = useState("")
  const [aauSeason, setAauSeason] = useState("")
  const [aauCompetitionLevel, setAauCompetitionLevel] = useState("")
  const [homeAway, setHomeAway] = useState("Home")
  const [saving, setSaving]     = useState(false)
  const [pendingAthleteId, setPendingAthleteId] = useState("")
  const pendingAthlete = useMemo(
    () => athletes.find((row) => row.id === pendingAthleteId) ?? null,
    [athletes, pendingAthleteId]
  )
  

  function invalidReason() {
    if (!athleteId)        return "Select an athlete profile first."
    if (!teamName.trim()) return "Enter your team."
    if (!opponent.trim()) return "Enter the opponent."
    if (!dateISO)         return "Pick a date."
    if (levelCategory === "k_12" && !levelGrade) return "Select a K-12 grade."
    if (levelCategory === "college" && !collegeSeason) return "Select a college academic season."
    if (levelCategory === "aau" && !aauSeason) return "Select an AAU season."
    if (levelCategory === "aau" && !aauCompetitionLevel) return "Select an AAU competition level."
    return null
  }

  async function startGame() {
    const why = invalidReason()
    if (why) { alert(why); return }

    setSaving(true)
    try {
      setActiveAthlete(athleteId)
      const payload = {
        level_category: levelCategory,
        level_grade: levelCategory === "k_12" ? levelGrade : null,
        college_season: levelCategory === "college" ? collegeSeason : null,
        aau_season: levelCategory === "aau" ? aauSeason : null,
        aau_competition_level: levelCategory === "aau" ? aauCompetitionLevel : null,
      }
      const row = await addGameSession({
        athlete_id: athleteId,
        date_iso: dateISO,
        team_name: teamName.trim(),
        opponent_name: opponent.trim(),
        venue: venue.trim() || null,
        ...payload,
        level: formatGameLevelLabel(payload),
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

  function onLevelCategoryChange(nextCategory) {
    setLevelCategory(nextCategory)
    setLevelGrade("")
    setCollegeSeason("")
    setAauSeason("")
    setAauCompetitionLevel("")
  }

  function renderLevelDetailField() {
    if (levelCategory === "k_12") {
      return (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
          <select
            value={levelGrade}
            onChange={e => setLevelGrade(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
          >
            <option value="">Select grade</option>
            {K12_GRADE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.label}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )
    }

    if (levelCategory === "college") {
      return (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Academic Season</label>
          <select
            value={collegeSeason}
            onChange={e => setCollegeSeason(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
          >
            <option value="">Select academic season</option>
            {collegeSeasonOptions.map((opt) => (
              <option key={opt.key} value={opt.label}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )
    }

    if (levelCategory === "aau") {
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">AAU Season</label>
            <select
              value={aauSeason}
              onChange={e => setAauSeason(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
            >
              <option value="">Select AAU season</option>
              {AAU_SEASON_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Competition Level</label>
            <select
              value={aauCompetitionLevel}
              onChange={e => setAauCompetitionLevel(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
            >
              <option value="">Select competition level</option>
              {AAU_COMPETITION_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )
    }

    return null
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
              value={levelCategory}
              onChange={e => onLevelCategoryChange(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
            >
              {LEVEL_CATEGORY_OPTIONS.map(l => (
                <option key={l.key} value={l.key}>
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

        {renderLevelDetailField()}

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
