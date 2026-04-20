import { beforeEach, describe, expect, it, vi } from "vitest"

import { computeGoalProgress, daysLeft, formatDueDate } from "../goals-ui"

vi.mock("../goal-metrics", () => ({
  computeGameMetricValue: vi.fn(() => 6),
  computePracticeMetricValue: vi.fn(() => 3),
  metricIsPercent: vi.fn((metric) => metric === "fg_pct_zone"),
  formatMetricValue: vi.fn((metric, value) => `${Math.round(value)}%`),
}))

describe("goals-ui", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-02-05T12:00:00Z"))
  })

  it("formats due dates for display", () => {
    expect(formatDueDate("2026-02-10")).toBe("Feb 10, 2026")
  })

  it("computes normalized days left from today", () => {
    expect(daysLeft("2026-02-10")).toBe(5)
  })

  it("computes game goal progress from game events", () => {
    const result = computeGoalProgress({
      goal: {
        metric: "points_total",
        target_value: 10,
        target_type: "total",
        target_end_date: "2026-02-10",
      },
      set: {
        type: "game",
        start_date: "2026-02-01",
        due_date: "2026-02-12",
      },
      gameEvents: [{ id: "ge-1" }],
      practiceEntries: [{ id: "pe-1" }],
    })

    expect(result).toMatchObject({
      targetRaw: 10,
      currentRaw: 6,
      progressPct: 60,
      targetLabel: "10",
      currentLabel: "6",
    })
  })

  it("computes practice goal progress from practice entries", () => {
    const result = computeGoalProgress({
      goal: {
        metric: "makes",
        target_value: 5,
        target_type: "total",
        target_end_date: "2026-02-10",
      },
      set: {
        type: "practice",
        start_date: "2026-02-01",
        due_date: "2026-02-12",
      },
      gameEvents: [{ id: "ge-1" }],
      practiceEntries: [{ id: "pe-1" }],
    })

    expect(result).toMatchObject({
      targetRaw: 5,
      currentRaw: 3,
      progressPct: 60,
      targetLabel: "5",
      currentLabel: "3",
    })
  })
})
