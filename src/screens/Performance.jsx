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

const DEFAULT_RANGE_ID = TIME_RANGES[0]?.id || "30d"

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

// ---- Metric card ----

function MetricCard({ label, fgPct, attemptsLabel, goalPct }) {
  const pctVal = isFinite(fgPct) ? Math.round(fgPct) : 0
  const goalVal =
    typeof goalPct === "number" && isFinite(goalPct)
      ? Math.round(goalPct)
      : null

  const progressPct =
    goalVal && goalVal > 0
      ? Math.max(0, Math.min(100, (pctVal / goalVal) * 100))
      : pctVal

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <div className="text-xs font-medium text-slate-700">{label}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {attemptsLabel}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-sky-700">
            {pctVal}
            <span className="text-[11px] font-normal text-slate-500 ml-0.5">
              %
            </span>
          </div>
          {goalVal != null && (
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
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-500 text-center">
        Not enough shot data yet to show a trend.
      </div>
    )
  }

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
            <YAxis
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(v) => `${Math.round(v)}%`}
              labelFormatter={(l) => l}
            />
            <Legend
              verticalAlign="bottom"
              height={24}
              wrapperStyle={{ fontSize: 10 }}
            />
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
  const [gameExpanded, setGameExpanded] = useState(true)
  const [practiceExpanded, setPracticeExpanded] = useState(true)

  const [gameRangeId, setGameRangeId] = useState(DEFAULT_RANGE_ID)
  const [practiceRangeId, setPracticeRangeId] = useState(DEFAULT_RANGE_ID)

  const [gameTrendMode, setGameTrendMode] = useState("daily")
  const [practiceTrendMode, setPracticeTrendMode] = useState("daily")

  const [gameLoading, setGameLoading] = useState(false)
  const [practiceLoading, setPracticeLoading] = useState(false)

  const [gameSelectedPoint, setGameSelectedPoint] = useState(null)
  const [practiceSelectedPoint, setPracticeSelectedPoint] = useState(null)

  const [gameData, setGameData] = useState({
    metrics: [],
    trend: [],
    overallFgPct: 0,
    overallEfgPct: 0,
    totalAttempts: 0,
    trendBuckets: { daily: [], weekly: [], monthly: [] },
  })
  const [practiceData, setPracticeData] = useState({
    metrics: [],
    trend: [],
    overallFgPct: 0,
    overallEfgPct: 0,
    totalAttempts: 0,
    trendBuckets: { daily: [], weekly: [], monthly: [] },
  })

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

  const gameRange = useMemo(() => getRangeById(gameRangeId), [gameRangeId])
  const practiceRange = useMemo(
    () => getRangeById(practiceRangeId),
    [practiceRangeId],
  )

  // Load Game performance
  useEffect(() => {
    let cancelled = false
    async function load() {
      setGameLoading(true)
      try {
        const data = await getGamePerformance({ days: gameRange.days })
        if (!cancelled) {
          setGameData(data)
          setGameSelectedPoint(null)
        }
      } catch (err) {
        console.warn("[Performance] getGamePerformance error:", err)
        if (!cancelled) {
          setGameData({
            metrics: [],
            trend: [],
            overallFgPct: 0,
            overallEfgPct: 0,
            totalAttempts: 0,
            trendBuckets: { daily: [], weekly: [], monthly: [] },
          })
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
  }, [gameRange.days])

  // Load Practice performance
  useEffect(() => {
    let cancelled = false
    async function load() {
      setPracticeLoading(true)
      try {
        const data = await getPracticePerformance({ days: practiceRange.days })
        if (!cancelled) {
          setPracticeData(data)
          setPracticeSelectedPoint(null)
        }
      } catch (err) {
        console.warn("[Performance] getPracticePerformance error:", err)
        if (!cancelled) {
          setPracticeData({
            metrics: [],
            trend: [],
            overallFgPct: 0,
            overallEfgPct: 0,
            totalAttempts: 0,
            trendBuckets: { daily: [], weekly: [], monthly: [] },
          })
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
  }, [practiceRange.days])

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
                <TimeRangePills value={gameRangeId} onChange={setGameRangeId} />
                <div className="text-[11px] text-slate-500">
                  {gameData.totalAttempts
                    ? `${gameData.totalAttempts} FG attempts`
                    : "No shots yet"}
                </div>
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
                      attemptsLabel={m.attemptsLabel}
                      goalPct={m.goalPct}
                    />
                  ))}
              </div>

              <div className="mt-4">
                <TrendChart
                  title="Game eFG% vs FG% Trend"
                  data={gameTrendData}
                  mode={gameTrendMode}
                  onModeChange={setGameTrendMode}
                  ticks={gameTrendTicks}
                  sourceLabel="Game"
                  selectedPoint={gameSelectedPoint}
                  onSelectPoint={setGameSelectedPoint}
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
                <TimeRangePills
                  value={practiceRangeId}
                  onChange={setPracticeRangeId}
                />
                <div className="text-[11px] text-slate-500">
                  {practiceData.totalAttempts
                    ? `${practiceData.totalAttempts} attempts`
                    : "No attempts yet"}
                </div>
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
                      attemptsLabel={m.attemptsLabel}
                      goalPct={m.goalPct}
                    />
                  ))}
              </div>

              <div className="mt-4">
                <TrendChart
                  title="Practice eFG% vs FG% Trend"
                  data={practiceTrendData}
                  mode={practiceTrendMode}
                  onModeChange={setPracticeTrendMode}
                  ticks={practiceTrendTicks}
                  sourceLabel="Practice"
                  selectedPoint={practiceSelectedPoint}
                  onSelectPoint={setPracticeSelectedPoint}
                />
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
