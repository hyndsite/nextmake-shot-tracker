import { useMemo } from "react"

import { BASE_METRIC_OPTIONS, GAME_ONLY_METRIC_OPTIONS } from "../../lib/goal-metrics"

export function useGoalsManagerDerivedState({ goalSets, selectedSetIdForGoal }) {
  const activeSorted = useMemo(
    () =>
      [...goalSets]
        .filter((set) => !set.archived)
        .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "")),
    [goalSets],
  )

  const archivedSorted = useMemo(
    () =>
      [...goalSets]
        .filter((set) => set.archived)
        .sort((a, b) => {
          const aKey = a.archived_at || a.due_date || ""
          const bKey = b.archived_at || b.due_date || ""
          return (bKey || "").localeCompare(aKey || "")
        }),
    [goalSets],
  )

  const selectedSetForGoal = useMemo(
    () => goalSets.find((set) => set.id === selectedSetIdForGoal) || null,
    [goalSets, selectedSetIdForGoal],
  )

  const availableMetricOptions = useMemo(() => {
    if (!selectedSetForGoal) return BASE_METRIC_OPTIONS
    if (selectedSetForGoal.type === "game") {
      return [...BASE_METRIC_OPTIONS, ...GAME_ONLY_METRIC_OPTIONS]
    }
    return BASE_METRIC_OPTIONS
  }, [selectedSetForGoal])

  return {
    activeSorted,
    archivedSorted,
    selectedSetForGoal,
    availableMetricOptions,
  }
}
