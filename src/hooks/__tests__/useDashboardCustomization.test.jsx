import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"

import { useDashboardCustomization } from "../useDashboardCustomization"
import { replaceAthleteDashboardMetrics } from "../../lib/athlete-dashboard-db"

vi.mock("../../lib/athlete-dashboard-db", () => ({
  replaceAthleteDashboardMetrics: vi.fn(),
}))

describe("useDashboardCustomization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("opens the customize drawer with sorted draft rows", () => {
    const { result } = renderHook(() =>
      useDashboardCustomization({
        activeAthleteId: "remote_zoe",
        dashboardMetrics: [
          {
            metric_key: "fg_overall",
            range_key: "30d",
            source_mode: "practice",
            position: 2,
            enabled: true,
          },
          {
            metric_key: "efg_overall",
            range_key: "7d",
            source_mode: "both",
            position: 0,
            enabled: true,
          },
        ],
        setDashboardMetrics: vi.fn(),
      }),
    )

    act(() => {
      result.current.openCustomizeDrawer()
    })

    expect(result.current.showCustomize).toBe(true)
    expect(result.current.draftMetrics).toEqual([
      expect.objectContaining({
        metricKey: "efg_overall",
        rangeKey: "7d",
        sourceMode: "both",
        position: 0,
      }),
      expect.objectContaining({
        metricKey: "fg_overall",
        rangeKey: "30d",
        sourceMode: "practice",
        position: 2,
      }),
    ])
  })

  it("removes a configured metric and persists the remaining rows", async () => {
    const setDashboardMetrics = vi.fn()
    replaceAthleteDashboardMetrics.mockResolvedValueOnce([])

    const { result } = renderHook(() =>
      useDashboardCustomization({
        activeAthleteId: "remote_zoe",
        dashboardMetrics: [
          {
            metric_key: "efg_overall",
            range_key: "7d",
            source_mode: "both",
            position: 0,
            enabled: true,
          },
          {
            metric_key: "fg_overall",
            range_key: "30d",
            source_mode: "practice",
            position: 1,
            enabled: true,
          },
        ],
        setDashboardMetrics,
      }),
    )

    await act(async () => {
      await result.current.removeConfiguredMetric(0)
    })

    expect(replaceAthleteDashboardMetrics).toHaveBeenCalledWith("remote_zoe", [
      expect.objectContaining({
        metricKey: "fg_overall",
        rangeKey: "30d",
        sourceMode: "practice",
        position: 0,
      }),
    ])
    expect(setDashboardMetrics).toHaveBeenCalledWith([])
  })
})
