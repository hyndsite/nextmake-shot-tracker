// src/Performance.jsx

import React, { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Filter as FilterIcon,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

import { TIME_RANGES, getRangeById } from "../constants/timeRange"
import {
  getGamePerformance,
  getPracticePerformance,
} from "../lib/performance-db"
import {
  listAthletes,
  getActiveAthleteId,
  setActiveAthlete,
} from "../lib/athlete-db"
import ActiveAthleteSwitcher from "../components/ActiveAthleteSwitcher"

const DEFAULT_RANGE_ID = TIME_RANGES[0]?.id || "30d"

// Shot Type filter pills
// NOTE: IDs here must match the values expected by performance-db.js filtering.
const SHOT_TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "catch_shoot", label: "Catch & Shoot" },
  { id: "off_dribble", label: "Off-dribble" },
]

// Contested filter pills (no title section per requirement)
const CONTEST_FILTERS = [
  { id: "contested", label: "Contested" },
  { id: "uncontested", label: "Uncontested" },
]

// Mode toggle (Attempts vs FG%) – mirrors Heatmap MODE_OPTIONS
const MODE_OPTIONS = [
  { id: "attempts", label: "Attempts" },
  { id: "fgpct", label: "FG%" },
]

const EMPTY_PERF_DATA = {
  metrics: [],
  trend: [],
  overallFgPct: 0,
  overallEfgPct: 0,
  totalAttempts: 0,
  trendBuckets: { daily: [], weekly: [], monthly: [] },
}

function ContestedPills({ value, onChange }) {
  const handleClick = (id) => {
    // Toggle off if already active (returns to "all"), otherwise select
    onChange(value === id ? "all" : id)
  }

  return (
    <div className="time-pill-group">
      {CONTEST_FILTERS.map((c) => {
        const active = c.id === value
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => handleClick(c.id)}
            className={"time-pill" + (active ? " time-pill--active" : "")}
          >
            {c.label}
          </button>
        )
      })}
    </div>
  )
}

function ModePills({ value, onChange }) {
  return (
    <div className="time-pill-group">
      {MODE_OPTIONS.map((m) => {
        const active = m.id === value
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={"time-pill" + (active ? " time-pill--active" : "")}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}


// ---- Pill component ----

function TimeRangePills({ value, onChange }) {
  return (
    <div className="time-pill-group">
      {TIME_RANGES.map((r) => {
        const active = r.id === value
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={"time-pill" + (active ? " time-pill--active" : "")}
          >
            {r.label}
          </button>
        )
      })}
    </div>
  )
}

function ShotTypePills({ value, onChange }) {
  return (
    <div className="time-pill-group">
      {SHOT_TYPE_FILTERS.map((s) => {
        const active = s.id === value
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={"time-pill" + (active ? " time-pill--active" : "")}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

// ---- Metric card ----

function MetricCard({ label, fgPct, attempts, makes, attemptsLabel, goalPct, mode, totalAttempts }) {
  const isAttempts = mode === "attempts"

  // Attempts mode: show raw count + volume%
  const volumePct =
    totalAttempts > 0 ? Math.round((attempts / totalAttempts) * 100) : 0

  // FG% mode (default): show FG%
  const pctVal = isFinite(fgPct) ? Math.round(fgPct) : 0
  const goalVal =
    typeof goalPct === "number" && isFinite(goalPct)
      ? Math.round(goalPct)
      : null

  const displayValue = isAttempts ? attempts : pctVal
  const displaySuffix = isAttempts ? "" : "%"
  const subtitle = isAttempts
    ? `${volumePct}% of total volume`
    : attemptsLabel

  const progressPct = isAttempts
    ? volumePct
    : goalVal && goalVal > 0
      ? Math.max(0, Math.min(100, (pctVal / goalVal) * 100))
      : pctVal

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <div className="text-xs font-medium text-slate-700">{label}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {subtitle}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-sky-700">
            {displayValue}
            {displaySuffix && (
              <span className="text-[11px] font-normal text-slate-500 ml-0.5">
                {displaySuffix}
              </span>
            )}
          </div>
          {!isAttempts && goalVal != null && (
            <div className="text-[11px] text-slate-500">Goal: {goalVal}%</div>
          )}
        </div>
      </div>

      <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  )
}

// ---- Trend chart + tick helpers ----

// Convert #days to a coarse range key so we don't depend on pill IDs
function rangeKeyFromDays(days) {
  if (days == null) return "all"
  if (days <= 30) return "30"
  if (days <= 60) return "60"
  if (days <= 180) return "180"
  return "all"
}

/**
 * Max ticks per mode / range key
 */
const MAX_TICKS = {
  daily: { "30": 7, "60": 8, "180": 8, all: 8 },
  weekly: { "30": 4, "60": 4, "180": 4, all: 4 },
  monthly: { "30": 1, "60": 2, "180": 6, all: 6 },
}

// Evenly sample labels from the data
function selectLabelsEvenly(data, maxTicks) {
  if (!Array.isArray(data) || data.length === 0 || !maxTicks) return undefined

  const n = Math.min(maxTicks, data.length)
  if (n <= 1) return [data[0].label]

  const indices = []
  const lastIndex = data.length - 1
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i * lastIndex) / (n - 1))
    indices.push(idx)
  }

  const labels = indices
    .map((i) => data[i]?.label)
    .filter((l) => typeof l === "string")

  return [...new Set(labels)]
}

function buildTicks(data, mode, days) {
  const rangeKey = rangeKeyFromDays(days)
  const cfg = MAX_TICKS[mode] || {}
  const maxTicks = cfg[rangeKey] ?? cfg.all ?? 8
  return selectLabelsEvenly(data, maxTicks)
}

function formatSelectedDate(payload) {
  if (!payload) return "—"

  const candidate =
    payload.date ||
    payload.date_iso ||
    payload.ts ||
    payload.label ||
    payload.start ||
    payload.end

  if (!candidate) return "—"

  // If it's already an ISO date like "2025-12-26"
  if (typeof candidate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    const d = new Date(candidate + "T00:00:00Z")
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    }
  }

  // If it's ISO timestamp
  const d = new Date(candidate)
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Fallback
  return String(candidate)
}

function TrendChart({
  title,
  data,
  mode = "daily",
  onModeChange,
  ticks,
  sourceLabel, // "Game" or "Practice"
  selectedPoint,
  onSelectPoint,
  vizMode = "fgpct", // "fgpct" | "attempts"
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-500 text-center">
        Not enough shot data yet to show a trend.
      </div>
    )
  }

  const isAttempts = vizMode === "attempts"

  const handleCycle = (e) => {
    e?.stopPropagation?.()
    if (typeof onModeChange === "function") {
      const next =
        mode === "daily" ? "weekly" : mode === "weekly" ? "monthly" : "daily"
      onModeChange(next)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleCycle(e)
    }
  }

  const modeLabel =
    mode === "daily" ? "Daily" : mode === "weekly" ? "Weekly" : "Monthly"

  const handleChartClick = (state) => {
    // Recharts click state typically contains activePayload when clicking near a point
    const payload = state?.activePayload?.[0]?.payload
    if (!payload) return
    if (typeof onSelectPoint === "function") onSelectPoint(payload)
  }

  const selectedText =
    selectedPoint && (selectedPoint.ts || selectedPoint.date || selectedPoint.label)
      ? `${sourceLabel || "Selected"} — ${formatSelectedDate(selectedPoint)}`
      : null

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-800">{title}</div>
        <div
          className="flex items-center gap-1 text-[11px] text-slate-500"
          role="button"
          tabIndex={0}
          onClick={handleCycle}
          onKeyDown={handleKeyDown}
        >
          <FilterIcon size={13} />
          <span>{modeLabel}</span>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 4, right: 10, left: -20, bottom: 0 }}
            onClick={handleChartClick}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              ticks={ticks}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            {isAttempts ? (
              <YAxis
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
            ) : (
              <YAxis
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
            )}
            <Tooltip
              formatter={(v, name) =>
                isAttempts ? `${v}` : `${Math.round(v)}%`
              }
              labelFormatter={(l) => l}
            />
            <Legend
              verticalAlign="bottom"
              height={24}
              wrapperStyle={{ fontSize: 10 }}
            />
            {isAttempts ? (
              <Line
                type="monotone"
                dataKey="fga"
                name="Attempts"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="efgPct"
                  name="eFG%"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="fgPct"
                  name="FG%"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {selectedText && (
        <div className="mt-2 text-[11px] text-slate-600">
          <span className="font-medium text-slate-800">Selected:</span>{" "}
          {selectedText}
        </div>
      )}
    </div>
  )
}

// ---- Section header ----

function SectionHeader({ title, expanded, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 accordion-header"
    >
      <span className="text-xs font-semibold text-slate-900">{title}</span>
      {expanded ? (
        <ChevronUp size={16} className="text-slate-500" />
      ) : (
        <ChevronDown size={16} className="text-slate-500" />
      )}
    </button>
  )
}

// ---- Main component ----

export default function Performance({ navigate }) {
  const [athletes, setAthletes] = useState(() => listAthletes())
  const [activeAthleteId, setActiveAthleteId] = useState(() => getActiveAthleteId() || "")

  const [gameExpanded, setGameExpanded] = useState(true)
  const [practiceExpanded, setPracticeExpanded] = useState(true)

  const [gameRangeId, setGameRangeId] = useState(DEFAULT_RANGE_ID)
  const [practiceRangeId, setPracticeRangeId] = useState(DEFAULT_RANGE_ID)

  const [gameShotType, setGameShotType] = useState("all")
  const [practiceShotType, setPracticeShotType] = useState("all")

  const [gameContested, setGameContested] = useState("all")
  const [practiceContested, setPracticeContested] = useState("all")

  const [gameMode, setGameMode] = useState("fgpct")
  const [practiceMode, setPracticeMode] = useState("fgpct")

  const [gameTrendMode, setGameTrendMode] = useState("daily")
  const [practiceTrendMode, setPracticeTrendMode] = useState("daily")

  const [gameLoading, setGameLoading] = useState(false)
  const [practiceLoading, setPracticeLoading] = useState(false)

  const [gameSelectedPoint, setGameSelectedPoint] = useState(null)
  const [practiceSelectedPoint, setPracticeSelectedPoint] = useState(null)

  const [gameData, setGameData] = useState(EMPTY_PERF_DATA)
  const [practiceData, setPracticeData] = useState(EMPTY_PERF_DATA)

  // Restore accordion state
  useEffect(() => {
    try {
      const g = window.localStorage.getItem("nm_perf_game_expanded")
      const p = window.localStorage.getItem("nm_perf_practice_expanded")
      if (g != null) setGameExpanded(g === "true")
      if (p != null) setPracticeExpanded(p === "true")
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    setAthletes(listAthletes())
    setActiveAthleteId(getActiveAthleteId() || "")
  }, [])

  const gameRange = useMemo(() => getRangeById(gameRangeId), [gameRangeId])
  const practiceRange = useMemo(
    () => getRangeById(practiceRangeId),
    [practiceRangeId],
  )

  // Load Game performance
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!activeAthleteId) {
        if (!cancelled) {
          setGameLoading(false)
          setGameData(EMPTY_PERF_DATA)
          setGameSelectedPoint(null)
        }
        return
      }
      setGameLoading(true)
      try {
        const data = await getGamePerformance({
          days: gameRange.days,
          shotType: gameShotType,
          contested: gameContested,
          athleteId: activeAthleteId,
        })
        if (!cancelled) {
          setGameData(data)
          setGameSelectedPoint(null)
        }
      } catch (err) {
        console.warn("[Performance] getGamePerformance error:", err)
        if (!cancelled) {
          setGameData(EMPTY_PERF_DATA)
          setGameSelectedPoint(null)
        }
      } finally {
        if (!cancelled) setGameLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [gameRange.days, gameShotType, gameContested, activeAthleteId])

  // Load Practice performance
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!activeAthleteId) {
        if (!cancelled) {
          setPracticeLoading(false)
          setPracticeData(EMPTY_PERF_DATA)
          setPracticeSelectedPoint(null)
        }
        return
      }
      setPracticeLoading(true)
      try {
        const data = await getPracticePerformance({
          days: practiceRange.days,
          shotType: practiceShotType,
          contested: practiceContested,
          athleteId: activeAthleteId,
        })
        if (!cancelled) {
          setPracticeData(data)
          setPracticeSelectedPoint(null)
        }
      } catch (err) {
        console.warn("[Performance] getPracticePerformance error:", err)
        if (!cancelled) {
          setPracticeData(EMPTY_PERF_DATA)
          setPracticeSelectedPoint(null)
        }
      } finally {
        if (!cancelled) setPracticeLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [practiceRange.days, practiceShotType, practiceContested, activeAthleteId])

  // Derived trend series and ticks (Game)
  const gameTrendData = useMemo(() => {
    const buckets = gameData.trendBuckets || {}
    if (gameTrendMode === "daily") return buckets.daily || []
    if (gameTrendMode === "weekly") return buckets.weekly || []
    if (gameTrendMode === "monthly")
      return buckets.monthly || gameData.trend || []
    return gameData.trend || []
  }, [gameData, gameTrendMode])

  const gameTrendTicks = useMemo(
    () => buildTicks(gameTrendData, gameTrendMode, gameRange.days),
    [gameTrendData, gameTrendMode, gameRange.days],
  )

  // Derived trend series and ticks (Practice)
  const practiceTrendData = useMemo(() => {
    const buckets = practiceData.trendBuckets || {}
    if (practiceTrendMode === "daily") return buckets.daily || []
    if (practiceTrendMode === "weekly") return buckets.weekly || []
    if (practiceTrendMode === "monthly")
      return buckets.monthly || practiceData.trend || []
    return practiceData.trend || []
  }, [practiceData, practiceTrendMode])

  const practiceTrendTicks = useMemo(
    () => buildTicks(practiceTrendData, practiceTrendMode, practiceRange.days),
    [practiceTrendData, practiceTrendMode, practiceRange.days],
  )

  function toggleGameExpanded() {
    setGameExpanded((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem("nm_perf_game_expanded", String(next))
      } catch {}
      return next
    })
  }

  function togglePracticeExpanded() {
    setPracticeExpanded((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem("nm_perf_practice_expanded", String(next))
      } catch {}
      return next
    })
  }

  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-screen-sm mx-auto px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Player Performance
          </h2>
          <div className="w-8 h-8 rounded-full bg-slate-200" />
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto p-4 pb-24 space-y-4">
        <ActiveAthleteSwitcher
          athletes={athletes}
          activeAthleteId={activeAthleteId}
          onSelectAthlete={(athleteId) => {
            setActiveAthlete(athleteId)
            setActiveAthleteId(athleteId)
          }}
        />

        {!activeAthleteId && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-sm text-amber-900">
              Select an active athlete from Dashboard to view performance.
            </div>
          </section>
        )}

        {/* GAME PERFORMANCE */}
        <section className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
          <SectionHeader
            title="Game"
            expanded={gameExpanded}
            onToggle={toggleGameExpanded}
          />

          {gameExpanded && (
            <>
              <div className="flex items-center justify-between mt-1">
                <ModePills value={gameMode} onChange={setGameMode} />
                <div className="text-[11px] text-slate-500">
                  {gameData.totalAttempts
                    ? `${gameData.totalAttempts} FG attempts`
                    : "No shots yet"}
                </div>
              </div>

              <div className="flex items-center justify-between mt-1">
                <TimeRangePills value={gameRangeId} onChange={setGameRangeId} />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <ShotTypePills value={gameShotType} onChange={setGameShotType} />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <ContestedPills value={gameContested} onChange={setGameContested} />
              </div>

              <div className="mt-3 space-y-2">
                {gameLoading && (
                  <div className="text-xs text-slate-500">
                    Loading game performance…
                  </div>
                )}
                {!gameLoading && gameData.metrics.length === 0 && (
                  <div className="text-xs text-slate-500">
                    No game shots logged in this range yet.
                  </div>
                )}
                {!gameLoading &&
                  gameData.metrics.map((m) => (
                    <MetricCard
                      key={m.id}
                      label={m.label}
                      fgPct={m.fgPct}
                      attempts={m.attempts}
                      makes={m.makes}
                      attemptsLabel={m.attemptsLabel}
                      goalPct={m.goalPct}
                      mode={gameMode}
                      totalAttempts={gameData.totalAttempts}
                    />
                  ))}
              </div>

              <div className="mt-4">
                <TrendChart
                  title={gameMode === "attempts" ? "Game Attempts Trend" : "Game eFG% vs FG% Trend"}
                  data={gameTrendData}
                  mode={gameTrendMode}
                  onModeChange={setGameTrendMode}
                  ticks={gameTrendTicks}
                  sourceLabel="Game"
                  selectedPoint={gameSelectedPoint}
                  onSelectPoint={setGameSelectedPoint}
                  vizMode={gameMode}
                />
              </div>
            </>
          )}
        </section>

        {/* PRACTICE PERFORMANCE */}
        <section className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
          <SectionHeader
            title="Practice"
            expanded={practiceExpanded}
            onToggle={togglePracticeExpanded}
          />

          {practiceExpanded && (
            <>
              <div className="flex items-center justify-between mt-1">
                <ModePills value={practiceMode} onChange={setPracticeMode} />
                <div className="text-[11px] text-slate-500">
                  {practiceData.totalAttempts
                    ? `${practiceData.totalAttempts} attempts`
                    : "No attempts yet"}
                </div>
              </div>

              <div className="flex items-center justify-between mt-1">
                <TimeRangePills
                  value={practiceRangeId}
                  onChange={setPracticeRangeId}
                />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <ShotTypePills
                  value={practiceShotType}
                  onChange={setPracticeShotType}
                />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <ContestedPills value={practiceContested} onChange={setPracticeContested} />
              </div>

              <div className="mt-3 space-y-2">
                {practiceLoading && (
                  <div className="text-xs text-slate-500">
                    Loading practice performance…
                  </div>
                )}
                {!practiceLoading && practiceData.metrics.length === 0 && (
                  <div className="text-xs text-slate-500">
                    No practice entries logged in this range yet.
                  </div>
                )}
                {!practiceLoading &&
                  practiceData.metrics.map((m) => (
                    <MetricCard
                      key={m.id}
                      label={m.label}
                      fgPct={m.fgPct}
                      attempts={m.attempts}
                      makes={m.makes}
                      attemptsLabel={m.attemptsLabel}
                      goalPct={m.goalPct}
                      mode={practiceMode}
                      totalAttempts={practiceData.totalAttempts}
                    />
                  ))}
              </div>

              <div className="mt-4">
                <TrendChart
                  title={practiceMode === "attempts" ? "Practice Attempts Trend" : "Practice eFG% vs FG% Trend"}
                  data={practiceTrendData}
                  mode={practiceTrendMode}
                  onModeChange={setPracticeTrendMode}
                  ticks={practiceTrendTicks}
                  sourceLabel="Practice"
                  selectedPoint={practiceSelectedPoint}
                  onSelectPoint={setPracticeSelectedPoint}
                  vizMode={practiceMode}
                />
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
