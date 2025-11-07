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

function TimeRangePills({ value, onChange }) {
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs">
      {TIME_RANGES.map((r) => {
        const active = r.id === value
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={
              "px-3 py-1 rounded-full font-semibold transition " +
              (active
                ? "bg-sky-600 text-white shadow-sm"
                : "bg-transparent text-slate-600 hover:text-slate-900")
            }
          >
            {r.label}
          </button>
        )
      })}
    </div>
  )
}

function MetricCard({ label, fgPct, attemptsLabel, goalPct }) {
  const pctVal = isFinite(fgPct) ? Math.round(fgPct) : 0
  const goalVal =
    typeof goalPct === "number" && isFinite(goalPct) ? Math.round(goalPct) : null

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

function TrendChart({ title, data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-500 text-center">
        Not enough shot data yet to show a trend.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-800">{title}</div>
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <FilterIcon size={13} />
          <span>Monthly</span>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="monthLabel"
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
            <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 10 }} />
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
    </div>
  )
}

function SectionHeader({ title, expanded, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-1"
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

export default function Performance({ navigate }) {
  const [gameExpanded, setGameExpanded] = useState(true)
  const [practiceExpanded, setPracticeExpanded] = useState(true)

  const [gameRangeId, setGameRangeId] = useState("30d")
  const [practiceRangeId, setPracticeRangeId] = useState("30d")

  const [gameLoading, setGameLoading] = useState(false)
  const [practiceLoading, setPracticeLoading] = useState(false)

  const [gameData, setGameData] = useState({
    metrics: [],
    trend: [],
    overallFgPct: 0,
    overallEfgPct: 0,
    totalAttempts: 0,
  })
  const [practiceData, setPracticeData] = useState({
    metrics: [],
    trend: [],
    overallFgPct: 0,
    overallEfgPct: 0,
    totalAttempts: 0,
  })

  // Restore accordion state from localStorage
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

  const gameRange = useMemo(
    () => getRangeById(gameRangeId),
    [gameRangeId],
  )
  const practiceRange = useMemo(
    () => getRangeById(practiceRangeId),
    [practiceRangeId],
  )

  // Load Game performance when filter changes
  useEffect(() => {
    let cancelled = false
    async function load() {
      setGameLoading(true)
      try {
        const data = await getGamePerformance({ days: gameRange.days })
        if (!cancelled) setGameData(data)
      } catch (err) {
        console.warn("[Performance] getGamePerformance error:", err)
        if (!cancelled) {
          setGameData({
            metrics: [],
            trend: [],
            overallFgPct: 0,
            overallEfgPct: 0,
            totalAttempts: 0,
          })
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

  // Load Practice performance when filter changes
  useEffect(() => {
    let cancelled = false
    async function load() {
      setPracticeLoading(true)
      try {
        const data = await getPracticePerformance({ days: practiceRange.days })
        if (!cancelled) setPracticeData(data)
      } catch (err) {
        console.warn("[Performance] getPracticePerformance error:", err)
        if (!cancelled) {
          setPracticeData({
            metrics: [],
            trend: [],
            overallFgPct: 0,
            overallEfgPct: 0,
            totalAttempts: 0,
          })
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
          <button
            type="button"
            onClick={() => navigate?.("home")}
            className="btn-back flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>
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
                <TimeRangePills
                  value={gameRangeId}
                  onChange={setGameRangeId}
                />
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
                  data={gameData.trend}
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
                  data={practiceData.trend}
                />
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
