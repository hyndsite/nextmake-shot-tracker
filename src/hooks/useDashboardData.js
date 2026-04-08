import { useEffect, useMemo, useState } from "react"

import {
  getActiveAthleteId,
  listAthletes,
  replaceAthletes,
  setActiveAthlete,
} from "../lib/athlete-db"
import {
  computeGameMetricValue,
  computePracticeMetricValue,
} from "../lib/goal-metrics"
import { listGoalSetsWithGoals } from "../lib/goals-db"
import { listAthleteDashboardMetrics } from "../lib/athlete-dashboard-db"
import { listAthleteProfiles } from "../lib/athlete-profiles-db"
import { getUser, supabase } from "../lib/supabase"

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

export function useDashboardData() {
  const [athletes, setAthletes] = useState(() => listAthletes())
  const [activeAthleteId, setActiveAthleteId] = useState(() => getActiveAthleteId())
  const [athletesError, setAthletesError] = useState("")
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [gameRows, setGameRows] = useState([])
  const [practiceRows, setPracticeRows] = useState([])
  const [dashboardMetrics, setDashboardMetrics] = useState([])
  const [dashboardMetricsLoading, setDashboardMetricsLoading] = useState(false)
  const [dashboardMetricsError, setDashboardMetricsError] = useState("")

  const activeAthlete = useMemo(
    () => athletes.find((athlete) => athlete.id === activeAthleteId) ?? null,
    [athletes, activeAthleteId],
  )

  const refreshAthletes = () => {
    setAthletes(listAthletes())
    setActiveAthleteId(getActiveAthleteId())
  }

  const selectAthlete = (athleteId) => {
    setActiveAthlete(athleteId)
    refreshAthletes()
  }

  useEffect(() => {
    let cancelled = false

    async function loadAthletes() {
      try {
        const remoteRows = await listAthleteProfiles()
        if (cancelled) return
        setAthletesError("")
        replaceAthletes(remoteRows)
        refreshAthletes()
      } catch (err) {
        if (!cancelled) {
          setAthletesError(err?.message || "Unable to load athletes")
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
      if (!activeAthleteId) {
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
            .eq("athlete_id", activeAthleteId)
            .order("ts", { ascending: true }),
          supabase
            .from("practice_entries")
            .select("*")
            .eq("user_id", user.id)
            .eq("athlete_id", activeAthleteId)
            .order("ts", { ascending: true }),
          listGoalSetsWithGoals({ athleteId: activeAthleteId }).catch(() => []),
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
      } catch {
        if (!cancelled) setSnapshot(EMPTY_SNAPSHOT)
      } finally {
        if (!cancelled) setSnapshotLoading(false)
      }
    }

    loadSnapshot()
    return () => {
      cancelled = true
    }
  }, [activeAthleteId])

  useEffect(() => {
    let cancelled = false

    async function loadDashboardMetrics() {
      if (!activeAthleteId) {
        if (!cancelled) setDashboardMetrics([])
        return
      }

      setDashboardMetricsLoading(true)
      setDashboardMetricsError("")
      try {
        const rows = await listAthleteDashboardMetrics({ athleteId: activeAthleteId, includeDisabled: true })
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
  }, [activeAthleteId])

  return {
    athletes,
    athletesError,
    activeAthleteId,
    activeAthlete,
    refreshAthletes,
    selectAthlete,
    snapshot,
    snapshotLoading,
    gameRows,
    practiceRows,
    dashboardMetrics,
    setDashboardMetrics,
    dashboardMetricsLoading,
    dashboardMetricsError,
    setDashboardMetricsError,
  }
}
