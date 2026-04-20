import {
  computeGameMetricValue,
  computePracticeMetricValue,
  formatMetricValue,
  metricIsPercent,
} from "./goal-metrics"

function parseIsoDateOnly(value) {
  if (typeof value !== "string") return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function normalizeDate(value) {
  if (!value) return null
  if (value instanceof Date) return new Date(value)
  return parseIsoDateOnly(value) || new Date(value)
}

export function formatDueDate(iso) {
  if (!iso) return ""
  try {
    const d = normalizeDate(iso)
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

export function daysLeft(iso) {
  if (!iso) return null
  const today = normalizeDate(new Date())
  const due = normalizeDate(iso)
  const diffMs = due.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  return diffDays
}

export function computeGoalProgress({ goal, set, gameEvents, practiceEntries }) {
  const metricKey = goal.metric
  const targetRaw = Number(goal.target_value ?? 0)
  const targetType = goal.target_type || "percent"
  const isPercentMetric = metricIsPercent(metricKey)

  const startDate = set?.start_date || undefined
  const endDate = goal.target_end_date || set?.due_date || undefined
  const zoneId = goal.zone_id || undefined
  const range = { startDate, endDate, zoneId }

  let currentRaw = 0
  if (set.type === "game") {
    currentRaw = computeGameMetricValue(metricKey, gameEvents, range)
  } else {
    currentRaw = computePracticeMetricValue(metricKey, practiceEntries, range)
  }

  const safeTarget = Number.isFinite(targetRaw) ? targetRaw : 0
  const safeCurrent = Number.isFinite(currentRaw) ? currentRaw : 0

  const progressPct =
    safeTarget > 0
      ? Math.min(100, Math.round((safeCurrent / safeTarget) * 100))
      : 0

  let targetLabel
  if (!safeTarget) {
    targetLabel = "—"
  } else if (isPercentMetric || targetType === "percent") {
    targetLabel = `${safeTarget}%`
  } else {
    targetLabel = String(safeTarget)
  }

  let currentLabel
  if (isPercentMetric) {
    currentLabel = formatMetricValue(metricKey, safeCurrent)
  } else if (targetType === "percent") {
    const v = Math.round(safeCurrent * 10) / 10
    currentLabel = `${v}%`
  } else {
    currentLabel = String(Math.round(safeCurrent))
  }

  return {
    targetRaw: safeTarget,
    currentRaw: safeCurrent,
    progressPct,
    targetLabel,
    currentLabel,
  }
}
