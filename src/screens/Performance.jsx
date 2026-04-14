// src/Performance.jsx

import React from "react"
import {
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

import { TIME_RANGES } from "../constants/timeRange"
import ActiveAthleteSwitcher from "../components/ActiveAthleteSwitcher"
import PerformanceSection from "../components/PerformanceSection"
import { usePerformanceData } from "../hooks/usePerformanceData"

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
  const {
    athletes,
    activeAthleteId,
    handleSelectAthlete,
    gameExpanded,
    toggleGameExpanded,
    practiceExpanded,
    togglePracticeExpanded,
    gameRangeId,
    setGameRangeId,
    practiceRangeId,
    setPracticeRangeId,
    gameShotType,
    setGameShotType,
    practiceShotType,
    setPracticeShotType,
    gameContested,
    setGameContested,
    practiceContested,
    setPracticeContested,
    gameMode,
    setGameMode,
    practiceMode,
    setPracticeMode,
    gameTrendMode,
    setGameTrendMode,
    practiceTrendMode,
    setPracticeTrendMode,
    gameLoading,
    practiceLoading,
    gameSelectedPoint,
    setGameSelectedPoint,
    practiceSelectedPoint,
    setPracticeSelectedPoint,
    gameData,
    practiceData,
    gameTrendData,
    gameTrendTicks,
    practiceTrendData,
    practiceTrendTicks,
  } = usePerformanceData()

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
          onSelectAthlete={handleSelectAthlete}
        />

        {!activeAthleteId && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-sm text-amber-900">
              Select an active athlete from Dashboard to view performance.
            </div>
          </section>
        )}

        <PerformanceSection
          title="Game"
          expanded={gameExpanded}
          onToggle={toggleGameExpanded}
          modeValue={gameMode}
          onModeChange={setGameMode}
          totalAttemptsText={
            gameData.totalAttempts
              ? `${gameData.totalAttempts} FG attempts`
              : "No shots yet"
          }
          rangeValue={gameRangeId}
          onRangeChange={setGameRangeId}
          shotTypeValue={gameShotType}
          onShotTypeChange={setGameShotType}
          contestedValue={gameContested}
          onContestedChange={setGameContested}
          loading={gameLoading}
          emptyText="No game shots logged in this range yet."
          metrics={gameData.metrics}
          trendTitle={
            gameMode === "attempts"
              ? "Game Attempts Trend"
              : "Game eFG% vs FG% Trend"
          }
          trendData={gameTrendData}
          trendMode={gameTrendMode}
          onTrendModeChange={setGameTrendMode}
          trendTicks={gameTrendTicks}
          sourceLabel="Game"
          selectedPoint={gameSelectedPoint}
          onSelectPoint={setGameSelectedPoint}
          vizMode={gameMode}
          totalAttempts={gameData.totalAttempts}
          ModePills={ModePills}
          TimeRangePills={TimeRangePills}
          ShotTypePills={ShotTypePills}
          ContestedPills={ContestedPills}
          MetricCard={MetricCard}
          TrendChart={TrendChart}
          SectionHeader={SectionHeader}
        />

        <PerformanceSection
          title="Practice"
          expanded={practiceExpanded}
          onToggle={togglePracticeExpanded}
          modeValue={practiceMode}
          onModeChange={setPracticeMode}
          totalAttemptsText={
            practiceData.totalAttempts
              ? `${practiceData.totalAttempts} attempts`
              : "No attempts yet"
          }
          rangeValue={practiceRangeId}
          onRangeChange={setPracticeRangeId}
          shotTypeValue={practiceShotType}
          onShotTypeChange={setPracticeShotType}
          contestedValue={practiceContested}
          onContestedChange={setPracticeContested}
          loading={practiceLoading}
          emptyText="No practice entries logged in this range yet."
          metrics={practiceData.metrics}
          trendTitle={
            practiceMode === "attempts"
              ? "Practice Attempts Trend"
              : "Practice eFG% vs FG% Trend"
          }
          trendData={practiceTrendData}
          trendMode={practiceTrendMode}
          onTrendModeChange={setPracticeTrendMode}
          trendTicks={practiceTrendTicks}
          sourceLabel="Practice"
          selectedPoint={practiceSelectedPoint}
          onSelectPoint={setPracticeSelectedPoint}
          vizMode={practiceMode}
          totalAttempts={practiceData.totalAttempts}
          ModePills={ModePills}
          TimeRangePills={TimeRangePills}
          ShotTypePills={ShotTypePills}
          ContestedPills={ContestedPills}
          MetricCard={MetricCard}
          TrendChart={TrendChart}
          SectionHeader={SectionHeader}
        />
      </main>
    </div>
  )
}
