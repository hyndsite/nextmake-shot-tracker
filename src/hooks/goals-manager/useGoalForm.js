import { useEffect, useState } from "react"

import { BASE_METRIC_OPTIONS, ZONE_METRICS } from "../../lib/goal-metrics"

export function useGoalForm({ selectedSetForGoal, availableMetricOptions }) {
  const [goalName, setGoalName] = useState("")
  const [goalDetails, setGoalDetails] = useState("")
  const [goalMetric, setGoalMetric] = useState(BASE_METRIC_OPTIONS[0]?.value || "")
  const [goalTarget, setGoalTarget] = useState("")
  const [goalEndDate, setGoalEndDate] = useState("")
  const [goalTargetType, setGoalTargetType] = useState("percent")
  const [goalZoneId, setGoalZoneId] = useState("")

  useEffect(() => {
    if (selectedSetForGoal?.due_date) {
      setGoalEndDate((prev) => prev || selectedSetForGoal.due_date)
    } else {
      setGoalEndDate("")
    }
  }, [selectedSetForGoal])

  useEffect(() => {
    if (!availableMetricOptions.length) return
    const isValid = availableMetricOptions.some((option) => option.value === goalMetric)
    if (!isValid) {
      setGoalMetric(availableMetricOptions[0].value)
    }
  }, [availableMetricOptions, goalMetric])

  function resetGoalForm() {
    setGoalName("")
    setGoalDetails("")
    setGoalMetric(availableMetricOptions[0]?.value || "")
    setGoalTarget("")
    setGoalEndDate(selectedSetForGoal?.due_date || "")
    setGoalTargetType("percent")
    setGoalZoneId("")
  }

  const addGoalDisabled =
    !goalMetric ||
    !goalTarget ||
    !goalEndDate ||
    (ZONE_METRICS.has(goalMetric) && !goalZoneId)

  return {
    goalName,
    goalDetails,
    goalMetric,
    goalTarget,
    goalEndDate,
    goalTargetType,
    goalZoneId,
    addGoalDisabled,
    setGoalName,
    setGoalDetails,
    setGoalMetric,
    setGoalTarget,
    setGoalEndDate,
    setGoalTargetType,
    setGoalZoneId,
    resetGoalForm,
  }
}
