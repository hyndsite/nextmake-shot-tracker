import { useEffect, useState } from "react"

import { listGoalSetsWithGoals } from "../../lib/goals-db"
import { getUser, supabase } from "../../lib/supabase"
import { listAthletes } from "../../lib/athlete-db"

export function useGoalsManagerQuery({ activeAthleteId, setSelectedSetIdForGoal }) {
  const [loading, setLoading] = useState(true)
  const [goalSets, setGoalSets] = useState([])
  const [athletes, setAthletes] = useState(() => listAthletes())
  const [gameEvents, setGameEvents] = useState([])
  const [practiceEntries, setPracticeEntries] = useState([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        setAthletes(listAthletes())
        const [sets, user] = await Promise.all([
          listGoalSetsWithGoals({ athleteId: activeAthleteId }),
          getUser(),
        ])

        let nextGameEvents = []
        let nextPracticeEntries = []

        if (user?.id) {
          const userId = user.id
          const [
            { data: gameData, error: gameError },
            { data: practiceData, error: practiceError },
          ] = await Promise.all([
            (() => {
              let query = supabase.from("game_events").select("*").eq("user_id", userId)
              if (activeAthleteId) {
                query = query.eq("athlete_id", activeAthleteId)
              }
              return query.order("ts", { ascending: true })
            })(),
            (() => {
              let query = supabase.from("practice_entries").select("*").eq("user_id", userId)
              if (activeAthleteId) {
                query = query.eq("athlete_id", activeAthleteId)
              }
              return query.order("ts", { ascending: true })
            })(),
          ])

          if (gameError) {
            console.warn("[GoalsManager] game_events fetch error:", gameError)
          }
          if (practiceError) {
            console.warn("[GoalsManager] practice_entries fetch error:", practiceError)
          }

          nextGameEvents = gameData || []
          nextPracticeEntries = practiceData || []
        }

        if (cancelled) return

        setGoalSets(sets || [])
        setGameEvents(nextGameEvents)
        setPracticeEntries(nextPracticeEntries)

        if (sets) {
          setSelectedSetIdForGoal((prev) => {
            if (!prev && sets.length) {
              const firstActive = sets.find((set) => !set.archived) || sets[0]
              return firstActive.id
            }
            if (prev && !sets.some((set) => set.id === prev)) {
              const firstActive = sets.find((set) => !set.archived) || sets[0]
              return firstActive?.id || ""
            }
            return prev
          })
        }
      } catch (err) {
        console.warn("[GoalsManager] load error:", err)
        if (!cancelled) {
          setGoalSets([])
          setGameEvents([])
          setPracticeEntries([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [activeAthleteId, setSelectedSetIdForGoal])

  return {
    loading,
    goalSets,
    athletes,
    gameEvents,
    practiceEntries,
    setGoalSets,
  }
}
