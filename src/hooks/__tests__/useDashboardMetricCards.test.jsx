import { describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"

import { useDashboardMetricCards } from "../useDashboardMetricCards"

describe("useDashboardMetricCards", () => {
  it("builds sorted metric cards and subtitle from dashboard metrics", () => {
    const { result } = renderHook(() =>
      useDashboardMetricCards({
        dashboardMetrics: [
          {
            id: "dm-2",
            metric_key: "fg_overall",
            range_key: "30d",
            source_mode: "practice",
            position: 1,
            enabled: true,
          },
          {
            id: "dm-1",
            metric_key: "efg_overall",
            range_key: "7d",
            source_mode: "both",
            position: 0,
            enabled: true,
          },
        ],
        gameRows: [],
        practiceRows: [],
      }),
    )

    expect(result.current.dashboardMetricsSubtitle).toBe("Add up to 3 metrics")
    expect(result.current.configuredMetricCards).toEqual([
      expect.objectContaining({
        id: "dm-1",
        label: "eFG% (overall)",
        rangeKey: "7d",
        sourceMode: "both",
        sourceLabel: "Game vs Practice",
      }),
      expect.objectContaining({
        id: "dm-2",
        label: "FG% (overall)",
        rangeKey: "30d",
        sourceMode: "practice",
        sourceLabel: "Practice",
      }),
    ])
  })
})
