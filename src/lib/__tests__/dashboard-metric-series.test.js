import { describe, expect, it } from "vitest"
import { buildDashboardMetricSeries } from "../dashboard-metric-series"

describe("dashboard-metric-series", () => {
  it("builds daily points for attempts with both sources", () => {
    const now = new Date("2026-02-24T12:00:00.000Z")
    const gameEvents = [
      {
        type: "shot",
        ts: "2026-02-24T10:00:00.000Z",
        made: true,
        is_three: true,
        zone_id: "wing_3",
      },
      {
        type: "shot",
        ts: "2026-02-23T10:00:00.000Z",
        made: false,
        is_three: false,
        zone_id: "rim",
      },
    ]
    const practiceEntries = [
      {
        ts: "2026-02-24T09:00:00.000Z",
        attempts: 3,
        makes: 2,
        zone_id: "rim",
      },
    ]

    const result = buildDashboardMetricSeries({
      metricKey: "total_attempts",
      rangeKey: "7d",
      sourceMode: "both",
      gameEvents,
      practiceEntries,
      now,
    })

    const today = result.points[result.points.length - 1]
    const yesterday = result.points[result.points.length - 2]

    expect(result.points).toHaveLength(7)
    expect(yesterday.game).toBe(1)
    expect(yesterday.practice).toBe(3)
    expect(yesterday.total).toBe(1)
    expect(today.game).toBe(1)
    expect(today.practice).toBe(3)
    expect(today.total).toBe(4)
  })

  it("computes eFG% for game source", () => {
    const now = new Date("2026-02-24T12:00:00.000Z")
    const gameEvents = [
      {
        type: "shot",
        ts: "2026-02-24T10:00:00.000Z",
        made: true,
        is_three: true,
        zone_id: "wing_3",
      },
      {
        type: "shot",
        ts: "2026-02-24T10:01:00.000Z",
        made: false,
        is_three: false,
        zone_id: "rim",
      },
    ]

    const result = buildDashboardMetricSeries({
      metricKey: "efg_overall",
      rangeKey: "7d",
      sourceMode: "game",
      gameEvents,
      practiceEntries: [],
      now,
    })

    const today = result.points[result.points.length - 1]
    expect(today.game).toBeCloseTo(75)
    expect(today.practice).toBeCloseTo(0)
    expect(today.total).toBeCloseTo(75)
  })

  it("interpolates across empty days and never drops to zero for FG%", () => {
    const now = new Date("2026-02-24T12:00:00.000Z")
    const gameEvents = [
      {
        type: "shot",
        ts: "2026-02-20T10:00:00.000Z",
        made: true,
        is_three: false,
        zone_id: "rim",
      },
      {
        type: "shot",
        ts: "2026-02-20T10:01:00.000Z",
        made: false,
        is_three: false,
        zone_id: "rim",
      },
      {
        type: "shot",
        ts: "2026-02-20T10:02:00.000Z",
        made: false,
        is_three: false,
        zone_id: "rim",
      },
      {
        type: "shot",
        ts: "2026-02-20T10:03:00.000Z",
        made: false,
        is_three: false,
        zone_id: "rim",
      },
      {
        type: "shot",
        ts: "2026-02-22T10:00:00.000Z",
        made: true,
        is_three: false,
        zone_id: "rim",
      },
      {
        type: "shot",
        ts: "2026-02-22T10:01:00.000Z",
        made: true,
        is_three: false,
        zone_id: "rim",
      },
      {
        type: "shot",
        ts: "2026-02-22T10:02:00.000Z",
        made: false,
        is_three: false,
        zone_id: "rim",
      },
      {
        type: "shot",
        ts: "2026-02-22T10:03:00.000Z",
        made: false,
        is_three: false,
        zone_id: "rim",
      },
      {
        type: "shot",
        ts: "2026-02-22T10:04:00.000Z",
        made: false,
        is_three: false,
        zone_id: "rim",
      },
      {
        type: "shot",
        ts: "2026-02-24T10:00:00.000Z",
        made: true,
        is_three: false,
        zone_id: "rim",
      },
      {
        type: "shot",
        ts: "2026-02-24T10:01:00.000Z",
        made: false,
        is_three: false,
        zone_id: "rim",
      },
      {
        type: "shot",
        ts: "2026-02-24T10:02:00.000Z",
        made: false,
        is_three: false,
        zone_id: "rim",
      },
    ]

    const result = buildDashboardMetricSeries({
      metricKey: "fg_overall",
      rangeKey: "7d",
      sourceMode: "game",
      gameEvents,
      practiceEntries: [],
      now,
    })

    const gameValues = result.points.map((point) => point.game)

    // 2026-02-18 and 2026-02-19 should be backfilled from first observed value (25).
    expect(gameValues[0]).toBeCloseTo(25)
    expect(gameValues[1]).toBeCloseTo(25)
    // 2026-02-21 should interpolate between 25 (02-20) and 40 (02-22).
    expect(gameValues[3]).toBeCloseTo(32.5)
    // 2026-02-23 should interpolate between 40 (02-22) and 33.33... (02-24).
    expect(gameValues[5]).toBeCloseTo(36.666, 2)
    // No point in the range should drop to zero due to missing days.
    expect(gameValues.every((value) => value > 0)).toBe(true)
  })
})
