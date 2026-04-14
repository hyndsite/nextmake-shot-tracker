import { useEffect, useMemo, useState } from "react"

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

const DEFAULT_RANGE_ID = TIME_RANGES[0]?.id || "30d"

const EMPTY_PERF_DATA = {
  metrics: [],
  trend: [],
  overallFgPct: 0,
  overallEfgPct: 0,
  totalAttempts: 0,
  trendBuckets: { daily: [], weekly: [], monthly: [] },
}

function rangeKeyFromDays(days) {
  if (days == null) return "all"
  if (days <= 30) return "30"
  if (days <= 60) return "60"
  if (days <= 180) return "180"
  return "all"
}

const MAX_TICKS = {
  daily: { "30": 7, "60": 8, "180": 8, all: 8 },
  weekly: { "30": 4, "60": 4, "180": 4, all: 4 },
  monthly: { "30": 1, "60": 2, "180": 6, all: 6 },
}

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
    .filter((label) => typeof label === "string")

  return [...new Set(labels)]
}

function buildTicks(data, mode, days) {
  const rangeKey = rangeKeyFromDays(days)
  const cfg = MAX_TICKS[mode] || {}
  const maxTicks = cfg[rangeKey] ?? cfg.all ?? 8
  return selectLabelsEvenly(data, maxTicks)
}

export function usePerformanceData() {
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
  const practiceRange = useMemo(() => getRangeById(practiceRangeId), [practiceRangeId])

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

    void load()
    return () => {
      cancelled = true
    }
  }, [gameRange.days, gameShotType, gameContested, activeAthleteId])

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

    void load()
    return () => {
      cancelled = true
    }
  }, [practiceRange.days, practiceShotType, practiceContested, activeAthleteId])

  const gameTrendData = useMemo(() => {
    const buckets = gameData.trendBuckets || {}
    if (gameTrendMode === "daily") return buckets.daily || []
    if (gameTrendMode === "weekly") return buckets.weekly || []
    if (gameTrendMode === "monthly") return buckets.monthly || gameData.trend || []
    return gameData.trend || []
  }, [gameData, gameTrendMode])

  const gameTrendTicks = useMemo(
    () => buildTicks(gameTrendData, gameTrendMode, gameRange.days),
    [gameTrendData, gameTrendMode, gameRange.days],
  )

  const practiceTrendData = useMemo(() => {
    const buckets = practiceData.trendBuckets || {}
    if (practiceTrendMode === "daily") return buckets.daily || []
    if (practiceTrendMode === "weekly") return buckets.weekly || []
    if (practiceTrendMode === "monthly") return buckets.monthly || practiceData.trend || []
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
      } catch {
        // ignore
      }
      return next
    })
  }

  function togglePracticeExpanded() {
    setPracticeExpanded((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem("nm_perf_practice_expanded", String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  function handleSelectAthlete(athleteId) {
    setActiveAthlete(athleteId)
    setActiveAthleteId(athleteId)
  }

  return {
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
  }
}
