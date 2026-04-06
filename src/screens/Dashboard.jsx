import { useEffect, useMemo, useRef, useState } from "react"
import { Archive, ArrowLeftRight, Plus } from "lucide-react"

import {
  addAthlete,
  archiveAthlete,
  getActiveAthleteId,
  listAthletes,
  replaceAthletes,
  setActiveAthlete,
} from "../lib/athlete-db"
import {
  archiveAthleteProfile,
  createAthleteProfile,
  listAthleteProfiles,
} from "../lib/athlete-profiles-db"
import { listGoalSetsWithGoals } from "../lib/goals-db"
import {
  computeGameMetricValue,
  computePracticeMetricValue,
} from "../lib/goal-metrics"
import {
  listAthleteDashboardMetrics,
  replaceAthleteDashboardMetrics,
} from "../lib/athlete-dashboard-db"
import {
  DASHBOARD_METRIC_GROUPS,
  DASHBOARD_METRIC_BY_KEY,
  getDashboardMetricLabel,
} from "../constants/dashboard-metrics"
import { buildDashboardMetricSeries } from "../lib/dashboard-metric-series"
import { getUser, supabase } from "../lib/supabase"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const EMPTY_SNAPSHOT = {
  fgPct7d: 0,
  efgPct7d: 0,
  attempts7d: 0,
  makes7d: 0,
  attemptsToday: 0,
  gameAttempts7d: 0,
  practiceAttempts7d: 0,
  topZone: null,
  weakestZone: null,
  streakDays: 0,
  lastSession: null,
  goalSummary: null,
}

function fullName(athlete) {
  if (!athlete) return "No active athlete"
  return `${athlete.first_name}${athlete.last_name ? ` ${athlete.last_name}` : ""}`
}

function zoneLabel(zoneId) {
  if (!zoneId) return "Unknown zone"
  if (zoneId === "free_throw") return "Free Throw"
  return zoneId
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function asDate(ts) {
  if (!ts) return null
  const d = typeof ts === "number" ? new Date(ts) : new Date(String(ts))
  return Number.isNaN(d.getTime()) ? null : d
}

function dayKey(ts) {
  const d = asDate(ts)
  if (!d) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`
}

function isPracticeFreeThrow(entry) {
  const shotType = String(entry?.shot_type || "").toLowerCase()
  const zoneId = String(entry?.zone_id || "").toLowerCase()
  return zoneId === "free_throw" || shotType.includes("free throw") || shotType === "ft"
}

function pct(makes, attempts) {
  if (!attempts) return 0
  return (makes / attempts) * 100
}

function fmtPct(value) {
  return `${(Math.round((Number(value) || 0) * 10) / 10).toFixed(1)}%`
}

function fmtValue(value, format) {
  if (format === "percent") return fmtPct(value)
  return String(Math.round(Number(value) || 0))
}

function Avatar({ athlete }) {
  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold text-slate-800 shrink-0"
      style={{ backgroundColor: athlete?.avatar_color || "#E2E8F0" }}
      aria-hidden="true"
    >
      {athlete?.initials || "NA"}
    </div>
  )
}

function AthleteRow({ athlete, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2 flex items-center gap-3 text-left transition active:scale-[0.99] ${
        selected
          ? "border-sky-600 bg-sky-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <Avatar athlete={athlete} />
      <div className="text-sm font-medium text-slate-900 truncate">{fullName(athlete)}</div>
    </button>
  )
}

const RANGE_OPTIONS = ["7d", "30d", "90d", "180d", "1y"]

function normalizeSourceMode(mode) {
  return mode === "game" || mode === "practice" || mode === "both" ? mode : "both"
}

function sourceFlags(mode) {
  const normalized = normalizeSourceMode(mode)
  return {
    game: normalized === "game" || normalized === "both",
    practice: normalized === "practice" || normalized === "both",
  }
}

function toSourceMode(game, practice) {
  if (game && practice) return "both"
  if (game) return "game"
  if (practice) return "practice"
  return ""
}

function buildEmptyMetricRow(position = 0) {
  return {
    metricKey: "",
    rangeKey: "7d",
    sourceMode: "both",
    position,
    enabled: true,
  }
}

export default function Dashboard() {
  const [athletes, setAthletes] = useState(() => listAthletes())
  const [activeId, setActiveId] = useState(() => getActiveAthleteId())
  const [showSwitch, setShowSwitch] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState("")
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [gameRows, setGameRows] = useState([])
  const [practiceRows, setPracticeRows] = useState([])
  const [dashboardMetrics, setDashboardMetrics] = useState([])
  const [dashboardMetricsLoading, setDashboardMetricsLoading] = useState(false)
  const [dashboardMetricsError, setDashboardMetricsError] = useState("")
  const [showCustomize, setShowCustomize] = useState(false)
  const [draftMetrics, setDraftMetrics] = useState([])
  const [draftError, setDraftError] = useState("")
  const [savingDashboardMetrics, setSavingDashboardMetrics] = useState(false)
  const [removingMetricPosition, setRemovingMetricPosition] = useState(null)
  const draftMetricsRef = useRef([])
  const dashboardSaveRequestRef = useRef(0)

  const activeAthlete = useMemo(
    () => athletes.find((athlete) => athlete.id === activeId) ?? null,
    [athletes, activeId]
  )

  const configuredMetricCards = useMemo(() => {
    return (dashboardMetrics || [])
      .filter((row) => row.enabled !== false)
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      .slice(0, 5)
      .map((row) => {
        const metricKey = row.metric_key
        const rangeKey = row.range_key || "7d"
        const sourceMode = normalizeSourceMode(row.source_mode || "both")
        const sourceLabel = sourceMode === "both"
          ? "Game vs Practice"
          : sourceMode === "game"
            ? "Game"
            : "Practice"

        return {
          id: row.id || `${metricKey}-${row.position}`,
          position: Number.isInteger(row.position) ? row.position : 0,
          label: getDashboardMetricLabel(metricKey),
          rangeKey,
          sourceMode,
          sourceLabel,
          format: DASHBOARD_METRIC_BY_KEY[metricKey]?.format || "number",
          series: buildDashboardMetricSeries({
            metricKey,
            rangeKey,
            sourceMode,
            gameEvents: gameRows,
            practiceEntries: practiceRows,
          }),
        }
      })
  }, [dashboardMetrics, gameRows, practiceRows])

  const dashboardMetricsSubtitle = useMemo(() => {
    const remaining = Math.max(0, 5 - configuredMetricCards.length)
    if (remaining === 0) return "Max number metrics reached"
    return `Add up to ${remaining} metrics`
  }, [configuredMetricCards.length])

  useEffect(() => {
    let cancelled = false

    async function loadAthletes() {
      try {
        const remoteRows = await listAthleteProfiles()
        if (cancelled) return
        replaceAthletes(remoteRows)
        refresh()
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load athletes")
        }
      }
    }

    loadAthletes()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadSnapshot() {
      if (!activeId) {
        if (!cancelled) setSnapshot(EMPTY_SNAPSHOT)
        if (!cancelled) setGameRows([])
        if (!cancelled) setPracticeRows([])
        return
      }

      setSnapshotLoading(true)
      try {
        const user = await getUser()
        if (!user?.id) {
          if (!cancelled) setSnapshot(EMPTY_SNAPSHOT)
          return
        }

        const [gameResp, practiceResp, goalSets] = await Promise.all([
          supabase
            .from("game_events")
            .select("*")
            .eq("user_id", user.id)
            .eq("athlete_id", activeId)
            .order("ts", { ascending: true }),
          supabase
            .from("practice_entries")
            .select("*")
            .eq("user_id", user.id)
            .eq("athlete_id", activeId)
            .order("ts", { ascending: true }),
          listGoalSetsWithGoals({ athleteId: activeId }).catch(() => []),
        ])

        const gameEvents = gameResp?.data || []
        const practiceEntries = practiceResp?.data || []
        if (!cancelled) {
          setGameRows(gameEvents)
          setPracticeRows(practiceEntries)
        }

        const now = new Date()
        const todayStart = new Date(now)
        todayStart.setHours(0, 0, 0, 0)
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - 6)
        weekStart.setHours(0, 0, 0, 0)

        const gameShots = gameEvents
          .filter((ev) => ev?.type === "shot")
          .map((ev) => ({
            ts: ev.ts,
            attempts: 1,
            makes: ev.made ? 1 : 0,
            isThree: !!ev.is_three,
            zoneId: ev.zone_id || "unknown_zone",
            source: "game",
          }))

        const practiceShots = practiceEntries
          .filter((entry) => !isPracticeFreeThrow(entry))
          .map((entry) => {
            const attempts = Math.max(0, Number(entry?.attempts || 0))
            const makes = Math.max(0, Number(entry?.makes || 0))
            return {
              ts: entry.ts,
              attempts,
              makes,
              isThree: false,
              zoneId: entry.zone_id || "unknown_zone",
              source: "practice",
            }
          })
          .filter((shot) => shot.attempts > 0)

        const allShots = [...gameShots, ...practiceShots]
        const weekShots = allShots.filter((shot) => {
          const d = asDate(shot.ts)
          return d && d >= weekStart
        })
        const todayShots = allShots.filter((shot) => {
          const d = asDate(shot.ts)
          return d && d >= todayStart
        })

        const attempts7d = weekShots.reduce((sum, shot) => sum + shot.attempts, 0)
        const makes7d = weekShots.reduce((sum, shot) => sum + shot.makes, 0)
        const threesMade7d = weekShots.reduce(
          (sum, shot) => sum + (shot.isThree ? shot.makes : 0),
          0,
        )
        const attemptsToday = todayShots.reduce((sum, shot) => sum + shot.attempts, 0)

        const gameAttempts7d = weekShots
          .filter((shot) => shot.source === "game")
          .reduce((sum, shot) => sum + shot.attempts, 0)
        const practiceAttempts7d = weekShots
          .filter((shot) => shot.source === "practice")
          .reduce((sum, shot) => sum + shot.attempts, 0)

        const zoneAgg = new Map()
        for (const shot of weekShots) {
          const rec = zoneAgg.get(shot.zoneId) || { attempts: 0, makes: 0 }
          rec.attempts += shot.attempts
          rec.makes += shot.makes
          zoneAgg.set(shot.zoneId, rec)
        }
        const zoneRows = [...zoneAgg.entries()]
          .map(([zoneId, values]) => ({
            zoneId,
            attempts: values.attempts,
            makes: values.makes,
            fgPct: pct(values.makes, values.attempts),
          }))
          .filter((row) => row.attempts >= 5)
        const topZone = zoneRows.sort((a, b) => b.fgPct - a.fgPct)[0] || null
        const weakestZone = zoneRows.sort((a, b) => a.fgPct - b.fgPct)[0] || null

        const daySet = new Set(allShots.map((shot) => dayKey(shot.ts)).filter(Boolean))
        let streakDays = 0
        const cursor = new Date(todayStart)
        while (true) {
          const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(
            2,
            "0",
          )}-${String(cursor.getDate()).padStart(2, "0")}`
          if (!daySet.has(key)) break
          streakDays += 1
          cursor.setDate(cursor.getDate() - 1)
        }

        const latestShot = [...allShots].sort((a, b) => {
          const ta = asDate(a.ts)?.getTime() || 0
          const tb = asDate(b.ts)?.getTime() || 0
          return tb - ta
        })[0]
        const lastSession = latestShot
          ? {
              source: latestShot.source,
              ts: latestShot.ts,
              attempts: latestShot.attempts,
              makes: latestShot.makes,
              zoneId: latestShot.zoneId,
            }
          : null

        const activeGoalSet = (goalSets || [])
          .filter((set) => !set.archived)
          .sort((a, b) => String(a.due_date || "").localeCompare(String(b.due_date || "")))[0]
        let goalSummary = null
        if (activeGoalSet) {
          const progressList = (activeGoalSet.goals || []).map((goal) => {
            const range = {
              startDate: activeGoalSet.start_date || undefined,
              endDate: goal.target_end_date || activeGoalSet.due_date || undefined,
              zoneId: goal.zone_id || undefined,
            }
            const current =
              activeGoalSet.type === "game"
                ? computeGameMetricValue(goal.metric, gameEvents, range)
                : computePracticeMetricValue(goal.metric, practiceEntries, range)
            const target = Number(goal.target_value || 0)
            if (!target) return 0
            return Math.max(0, Math.min(100, (current / target) * 100))
          })
          const avgProgress = progressList.length
            ? progressList.reduce((sum, v) => sum + v, 0) / progressList.length
            : 0
          goalSummary = {
            setName: activeGoalSet.name,
            dueDate: activeGoalSet.due_date || null,
            progressPct: Math.round(avgProgress),
          }
        }

        if (!cancelled) {
          setSnapshot({
            fgPct7d: pct(makes7d, attempts7d),
            efgPct7d: pct(makes7d + 0.5 * threesMade7d, attempts7d),
            attempts7d,
            makes7d,
            attemptsToday,
            gameAttempts7d,
            practiceAttempts7d,
            topZone,
            weakestZone,
            streakDays,
            lastSession,
            goalSummary,
          })
        }
      } catch (err) {
        if (!cancelled) setSnapshot(EMPTY_SNAPSHOT)
      } finally {
        if (!cancelled) setSnapshotLoading(false)
      }
    }

    loadSnapshot()
    return () => {
      cancelled = true
    }
  }, [activeId])

  useEffect(() => {
    let cancelled = false

    async function loadDashboardMetrics() {
      if (!activeId) {
        if (!cancelled) setDashboardMetrics([])
        return
      }

      setDashboardMetricsLoading(true)
      setDashboardMetricsError("")
      try {
        const rows = await listAthleteDashboardMetrics({ athleteId: activeId, includeDisabled: true })
        if (!cancelled) {
          setDashboardMetrics(rows || [])
        }
      } catch (err) {
        if (!cancelled) {
          setDashboardMetrics([])
          setDashboardMetricsError(err?.message || "Unable to load dashboard metrics")
        }
      } finally {
        if (!cancelled) setDashboardMetricsLoading(false)
      }
    }

    loadDashboardMetrics()
    return () => {
      cancelled = true
    }
  }, [activeId])

  const refresh = () => {
    setAthletes(listAthletes())
    setActiveId(getActiveAthleteId())
  }

  const handleSelectAthlete = (id) => {
    setActiveAthlete(id)
    setShowSwitch(false)
    refresh()
  }

  const handleAddAthlete = async (e) => {
    e.preventDefault()
    setError("")

    try {
      const remote = await createAthleteProfile({ firstName, lastName })
      const created = addAthlete({
        firstName: remote.first_name,
        lastName: remote.last_name || "",
        id: remote.id,
        createdAt: remote.created_at,
        avatarColor: remote.avatar_color || undefined,
      })
      setFirstName("")
      setLastName("")
      setShowAdd(false)
      setActiveAthlete(created.id)
      refresh()
    } catch (err) {
      setError(err?.message || "Unable to add athlete")
    }
  }

  const handleArchiveAthlete = async () => {
    if (!activeAthlete?.id) return
    const ok = window.confirm(`Archive ${fullName(activeAthlete)}?`)
    if (!ok) return
    setError("")

    try {
      await archiveAthleteProfile(activeAthlete.id)
      archiveAthlete(activeAthlete.id)
      setShowSwitch(false)
      refresh()
    } catch (err) {
      setError(err?.message || "Unable to archive athlete")
    }
  }

  const openCustomizeDrawer = () => {
    const nextRows = (dashboardMetrics || [])
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      .slice(0, 5)
      .map((row, index) => ({
        metricKey: row.metric_key || "",
        rangeKey: row.range_key || "7d",
        sourceMode: normalizeSourceMode(row.source_mode || "both"),
        position: Number.isInteger(row.position) ? row.position : index,
        enabled: row.enabled !== false,
      }))
    draftMetricsRef.current = nextRows
    setDraftMetrics(nextRows)
    setDraftError("")
    setShowCustomize(true)
  }

  const closeCustomizeDrawer = () => {
    setShowCustomize(false)
    setDraftError("")
  }

  const toCleanedDraftRows = (rows) => rows
    .map((row, index) => ({
      metricKey: String(row.metricKey || "").trim(),
      rangeKey: row.rangeKey || "7d",
      sourceMode: normalizeSourceMode(row.sourceMode || "both"),
      position: index,
      enabled: row.enabled !== false,
    }))
    .filter((row) => row.metricKey)

  const persistDraftMetrics = async (rows) => {
    if (!activeId) {
      setDraftError("Select an active athlete before saving.")
      return
    }

    const cleaned = toCleanedDraftRows(rows)
    if (cleaned.length > 5) {
      setDraftError("You can select at most 5 metrics.")
      return
    }
    for (const row of cleaned) {
      const flags = sourceFlags(row.sourceMode)
      if (!flags.game && !flags.practice) {
        setDraftError("Each metric must include Game, Practice, or both.")
        return
      }
    }

    const requestId = dashboardSaveRequestRef.current + 1
    dashboardSaveRequestRef.current = requestId
    setSavingDashboardMetrics(true)
    setDraftError("")
    try {
      const rowsSaved = await replaceAthleteDashboardMetrics(activeId, cleaned)
      if (dashboardSaveRequestRef.current !== requestId) return
      setDashboardMetrics(rowsSaved || [])
    } catch (err) {
      if (dashboardSaveRequestRef.current !== requestId) return
      setDraftError(err?.message || "Unable to save dashboard settings")
    } finally {
      if (dashboardSaveRequestRef.current === requestId) {
        setSavingDashboardMetrics(false)
      }
    }
  }

  const updateDraftMetric = (index, patch) => {
    const prev = draftMetricsRef.current
    const next = prev.map((row, i) => (i === index ? { ...row, ...patch, position: i } : { ...row, position: i }))
    draftMetricsRef.current = next
    setDraftMetrics(next)
    void persistDraftMetrics(next)
  }

  const addDraftMetric = () => {
    const prev = draftMetricsRef.current
    if (prev.length >= 5) return
    const next = [...prev, buildEmptyMetricRow(prev.length)]
    draftMetricsRef.current = next
    setDraftMetrics(next)
    void persistDraftMetrics(next)
  }

  const removeDraftMetric = (index) => {
    const prev = draftMetricsRef.current
    const next = prev.filter((_, i) => i !== index).map((row, i) => ({ ...row, position: i }))
    draftMetricsRef.current = next
    setDraftMetrics(next)
    void persistDraftMetrics(next)
  }

  const removeConfiguredMetric = async (position) => {
    if (!activeId) return

    const remainingRows = (dashboardMetrics || [])
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      .filter((row) => Number(row.position) !== Number(position))
      .slice(0, 5)
      .map((row, index) => ({
        metricKey: row.metric_key || "",
        rangeKey: row.range_key || "7d",
        sourceMode: normalizeSourceMode(row.source_mode || "both"),
        position: index,
        enabled: row.enabled !== false,
      }))
      .filter((row) => row.metricKey)

    setRemovingMetricPosition(position)
    setDashboardMetricsError("")
    try {
      const rows = await replaceAthleteDashboardMetrics(activeId, remainingRows)
      setDashboardMetrics(rows || [])
    } catch (err) {
      setDashboardMetricsError(err?.message || "Unable to remove dashboard metric")
    } finally {
      setRemovingMetricPosition(null)
    }
  }

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-screen-sm mx-auto px-4 py-3">
          <h2 className="screen-title">Dashboard</h2>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto p-4 pb-24 space-y-4">
        <section className="card space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="min-w-0 rounded-2xl border border-slate-300 bg-white p-[2px] shadow-sm">
              <div
                className="rounded-[14px] p-[2px]"
                style={{ backgroundColor: activeAthlete?.avatar_color || "#CBD5E1" }}
              >
                <div className="rounded-xl bg-gradient-to-r from-white to-slate-50 px-2.5 py-2 flex items-center gap-2.5">
                  <Avatar athlete={activeAthlete} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Active athlete</div>
                    <div className="text-sm font-semibold text-slate-900 truncate">{fullName(activeAthlete)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div
              role="group"
              aria-label="Active athlete actions"
              className="flex items-center justify-end gap-1.5 shrink-0"
            >
              <button
                type="button"
                className="h-9 w-9 p-0 rounded-full border border-sky-300 bg-sky-50 text-sky-700 inline-flex items-center justify-center shadow-sm transition hover:bg-sky-100"
                onClick={() => setShowSwitch((v) => !v)}
                aria-label="Switch athlete"
                title="Switch athlete"
              >
                <ArrowLeftRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              </button>

              <button
                type="button"
                className="h-9 w-9 p-0 rounded-full border-2 border-emerald-600 bg-white text-emerald-600 inline-flex items-center justify-center shadow-sm transition hover:bg-emerald-50"
                onClick={() => setShowAdd((v) => !v)}
                aria-label="Open add athlete"
                title="Add athlete"
              >
                <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              </button>

              <button
                type="button"
                className="h-9 w-9 p-0 rounded-full border border-amber-500 bg-white text-amber-600 inline-flex items-center justify-center shadow-sm transition hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={handleArchiveAthlete}
                aria-label="Archive athlete"
                title="Archive athlete"
                disabled={!activeAthlete}
              >
                <Archive className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {showSwitch && (
            <div className="space-y-2" aria-label="Athlete list">
              {athletes.length === 0 && (
                <div className="text-sm text-slate-500">No athlete profiles yet.</div>
              )}
              {athletes.map((athlete) => (
                <AthleteRow
                  key={athlete.id}
                  athlete={athlete}
                  selected={athlete.id === activeId}
                  onClick={() => handleSelectAthlete(athlete.id)}
                />
              ))}
            </div>
          )}

          {showAdd && (
            <form className="space-y-2" onSubmit={handleAddAthlete}>
              <div>
                <label className="label" htmlFor="athlete-first-name">First name</label>
                <input
                  id="athlete-first-name"
                  className="input"
                  value={firstName}
                  maxLength={20}
                  required
                  onChange={(e) => setFirstName(e.target.value.slice(0, 20))}
                />
              </div>
              <div>
                <label className="label" htmlFor="athlete-last-name">Last name (optional)</label>
                <input
                  id="athlete-last-name"
                  className="input"
                  value={lastName}
                  maxLength={20}
                  onChange={(e) => setLastName(e.target.value.slice(0, 20))}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" className="btn btn-blue w-full">Add athlete</button>
            </form>
          )}
        </section>

        <section className="card space-y-3">
          <div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Dashboard Metrics</h3>
              <div className="text-xs text-slate-500">{dashboardMetricsSubtitle}</div>
            </div>
          </div>
          {dashboardMetricsLoading && (
            <div className="text-xs text-slate-500">Loading dashboard metrics...</div>
          )}
          {dashboardMetricsError && (
            <div className="text-xs text-red-600">{dashboardMetricsError}</div>
          )}
          {configuredMetricCards.length > 0 && (
            <div className="space-y-2">
              {configuredMetricCards.map((card) => (
                <div key={card.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">{card.label}</div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-slate-500">
                        {card.rangeKey} • {card.sourceLabel}
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-600 disabled:opacity-50"
                        aria-label={`Remove ${card.label}`}
                        onClick={() => removeConfiguredMetric(card.position)}
                        disabled={removingMetricPosition === card.position}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={120}>
                      <LineChart data={card.series.points}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="dayKey" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value) => fmtValue(value, card.format)} />
                        {(card.sourceMode === "both" || card.sourceMode === "game") && (
                          <Line
                            type="monotone"
                            dataKey="game"
                            stroke="#0EA5E9"
                            dot={false}
                            strokeWidth={2}
                            name="Game"
                          />
                        )}
                        {(card.sourceMode === "both" || card.sourceMode === "practice") && (
                          <Line
                            type="monotone"
                            dataKey="practice"
                            stroke="#10B981"
                            dot={false}
                            strokeWidth={2}
                            name="Practice"
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}
          {configuredMetricCards.length < 5 && (
            <button
              type="button"
              className="group w-1/2 aspect-square rounded-2xl border-2 border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 text-sm font-semibold text-slate-700 shadow-[0_5px_12px_-9px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.85)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_14px_-10px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] active:translate-y-0 active:shadow-[0_3px_8px_-7px_rgba(15,23,42,0.32),inset_0_1px_0_rgba(255,255,255,0.8)]"
              onClick={openCustomizeDrawer}
            >
              <span className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/80 px-3 py-1 shadow-sm">
                + Add Metric
              </span>
            </button>
          )}
        </section>

        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Performance Snapshot</h3>
            {snapshotLoading && <span className="text-xs text-slate-500">Updating...</span>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">eFG% (7d)</div>
              <div className="text-lg font-semibold text-slate-900">{fmtPct(snapshot.efgPct7d)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">FG% (7d)</div>
              <div className="text-lg font-semibold text-slate-900">{fmtPct(snapshot.fgPct7d)}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Shots Today</div>
              <div className="text-base font-semibold text-slate-900">{snapshot.attemptsToday}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Shots (7d)</div>
              <div className="text-base font-semibold text-slate-900">{snapshot.attempts7d}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Streak</div>
              <div className="text-base font-semibold text-slate-900">{snapshot.streakDays}d</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Makes / Attempts (7d)</div>
              <div className="text-sm font-semibold text-slate-900">
                {snapshot.makes7d} / {snapshot.attempts7d} ({fmtPct(pct(snapshot.makes7d, snapshot.attempts7d))})
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Practice vs Game (7d)</div>
              <div className="text-sm font-semibold text-slate-900">
                P {snapshot.practiceAttempts7d} • G {snapshot.gameAttempts7d}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Top Zone (7d)</div>
              <div className="text-sm font-semibold text-slate-900">
                {snapshot.topZone ? `${zoneLabel(snapshot.topZone.zoneId)} · ${fmtPct(snapshot.topZone.fgPct)}` : "Not enough shots"}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Weakest Zone (7d)</div>
              <div className="text-sm font-semibold text-slate-900">
                {snapshot.weakestZone
                  ? `${zoneLabel(snapshot.weakestZone.zoneId)} · ${fmtPct(snapshot.weakestZone.fgPct)}`
                  : "Not enough shots"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Last Session</div>
              <div className="text-sm font-semibold text-slate-900">
                {snapshot.lastSession
                  ? `${snapshot.lastSession.source === "game" ? "Game" : "Practice"} · ${zoneLabel(snapshot.lastSession.zoneId)} · ${snapshot.lastSession.makes}/${snapshot.lastSession.attempts}`
                  : "No sessions yet"}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Current Goal Progress</div>
              <div className="text-sm font-semibold text-slate-900">
                {snapshot.goalSummary
                  ? `${snapshot.goalSummary.progressPct}% · ${snapshot.goalSummary.setName}`
                  : "No active goals"}
              </div>
            </div>
          </div>
        </section>
      </main>

      {showCustomize && (
        <div className="fixed inset-0 z-30">
          <button
            type="button"
            aria-label="Close customize dashboard"
            className="absolute inset-0 bg-slate-900/30"
            onClick={closeCustomizeDrawer}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-xl border-l border-slate-200 flex flex-col">
            <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Customize Dashboard</h3>
                <p className="text-xs text-slate-500">{fullName(activeAthlete)}</p>
              </div>
              <button
                type="button"
                className="h-8 rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-700"
                onClick={closeCustomizeDrawer}
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <button
                type="button"
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700"
                onClick={addDraftMetric}
                disabled={draftMetrics.length >= 5}
              >
                Add metric
              </button>

              {draftMetrics.map((row, index) => {
                const flags = sourceFlags(row.sourceMode)
                return (
                  <div key={`metric-row-${index}`} className="rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metric {index + 1}</div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-600"
                        onClick={() => removeDraftMetric(index)}
                      >
                        Remove
                      </button>
                    </div>

                    <label className="block text-xs font-medium text-slate-700" htmlFor={`metric-${index}`}>
                      Metric
                    </label>
                    <select
                      id={`metric-${index}`}
                      aria-label="Metric"
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
                      value={row.metricKey}
                      onChange={(e) => updateDraftMetric(index, { metricKey: e.target.value })}
                    >
                      <option value="">Select metric</option>
                      {DASHBOARD_METRIC_GROUPS.map((group) => (
                        <optgroup
                          key={`${group.category}-${group.subcategory}`}
                          label={`${group.category} / ${group.subcategory}`}
                        >
                          {group.options.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    <div className="space-y-1">
                      <div className="text-xs font-medium text-slate-700">Range</div>
                      <div className="flex flex-wrap gap-1.5">
                        {RANGE_OPTIONS.map((rangeKey) => (
                          <button
                            key={`${index}-${rangeKey}`}
                            type="button"
                            onClick={() => updateDraftMetric(index, { rangeKey })}
                            className={`h-8 rounded-full border px-2.5 text-xs font-semibold ${
                              row.rangeKey === rangeKey
                                ? "border-sky-600 bg-sky-50 text-sky-700"
                                : "border-slate-300 text-slate-700"
                            }`}
                          >
                            {rangeKey}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-medium text-slate-700">Source</div>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={flags.game}
                            onChange={(e) => {
                              const nextMode = toSourceMode(e.target.checked, flags.practice)
                              if (!nextMode) return
                              updateDraftMetric(index, { sourceMode: nextMode })
                            }}
                          />
                          Game
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={flags.practice}
                            onChange={(e) => {
                              const nextMode = toSourceMode(flags.game, e.target.checked)
                              if (!nextMode) return
                              updateDraftMetric(index, { sourceMode: nextMode })
                            }}
                          />
                          Practice
                        </label>
                      </div>
                    </div>
                  </div>
                )
              })}

              {draftError && (
                <div className="text-xs text-red-600">{draftError}</div>
              )}
            </div>

            <div className="border-t border-slate-200 p-4 flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500">
                {savingDashboardMetrics ? "Saving changes..." : "Changes save automatically"}
              </div>
              <button
                type="button"
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700"
                onClick={closeCustomizeDrawer}
              >
                Close
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
