import { describe, expect, it } from "vitest"
import {
  DASHBOARD_METRIC_OPTIONS,
  DASHBOARD_METRIC_KEYS,
  getDashboardMetricLabel,
} from "../dashboard-metrics"

describe("dashboard-metrics constants", () => {
  it("exports the six v1 metric keys", () => {
    expect(DASHBOARD_METRIC_KEYS).toEqual([
      "efg_overall",
      "fg_overall",
      "total_attempts",
      "total_makes",
      "shot_share_3pa",
      "shot_share_rim",
    ])
  })

  it("exports grouped options with category and subcategory labels", () => {
    expect(DASHBOARD_METRIC_OPTIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "Efficiency",
          subcategory: "Core Shooting",
        }),
        expect.objectContaining({
          category: "Volume",
          subcategory: "Shot Volume",
        }),
        expect.objectContaining({
          category: "Shot Profile Composition",
          subcategory: "Shot Selection Distribution",
        }),
      ]),
    )
  })

  it("resolves a human label from a metric key", () => {
    expect(getDashboardMetricLabel("efg_overall")).toBe("eFG% (overall)")
    expect(getDashboardMetricLabel("missing_key")).toBe("Unknown metric")
  })
})
