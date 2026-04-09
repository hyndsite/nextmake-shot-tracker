import { useMemo } from "react"

import {
  DASHBOARD_METRIC_BY_KEY,
  getDashboardMetricLabel,
} from "../constants/dashboard-metrics"
import { buildDashboardMetricSeries } from "../lib/dashboard-metric-series"
import { normalizeSourceMode } from "./useDashboardCustomization"

export function useDashboardMetricCards({
  dashboardMetrics,
  gameRows,
  practiceRows,
}) {
  const configuredMetricCards = useMemo(() => {
    return (dashboardMetrics || [])
      .filter((row) => row.enabled !== false)
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      .slice(0, 5)
      .map((row) => {
        const metricKey = row.metric_key
        const rangeKey = row.range_key || "7d"
        const sourceMode = normalizeSourceMode(row.source_mode || "both")
        const sourceLabel = sourceMode === "both"
          ? "Game vs Practice"
          : sourceMode === "game"
            ? "Game"
            : "Practice"

        return {
          id: row.id || `${metricKey}-${row.position}`,
          position: Number.isInteger(row.position) ? row.position : 0,
          label: getDashboardMetricLabel(metricKey),
          rangeKey,
          sourceMode,
          sourceLabel,
          format: DASHBOARD_METRIC_BY_KEY[metricKey]?.format || "number",
          series: buildDashboardMetricSeries({
            metricKey,
            rangeKey,
            sourceMode,
            gameEvents: gameRows,
            practiceEntries: practiceRows,
          }),
        }
      })
  }, [dashboardMetrics, gameRows, practiceRows])

  const dashboardMetricsSubtitle = useMemo(() => {
    const remaining = Math.max(0, 5 - configuredMetricCards.length)
    if (remaining === 0) return "Max number metrics reached"
    return `Add up to ${remaining} metrics`
  }, [configuredMetricCards.length])

  return {
    configuredMetricCards,
    dashboardMetricsSubtitle,
  }
}
