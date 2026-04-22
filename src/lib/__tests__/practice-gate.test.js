import { describe, expect, it } from "vitest"

import {
  getInitialSelectedAthleteId,
  groupPracticeSessionsByMonth,
} from "../practice-gate"

describe("practice-gate", () => {
  it("derives the initial selected athlete id", () => {
    expect(
      getInitialSelectedAthleteId([{ id: "ath-1" }, { id: "ath-2" }], "ath-2"),
    ).toBe("ath-2")
    expect(getInitialSelectedAthleteId([{ id: "ath-1" }], "")).toBe("ath-1")
    expect(getInitialSelectedAthleteId([], "")).toBe("")
  })

  it("groups practice sessions by month and excludes the active session", () => {
    const months = groupPracticeSessionsByMonth(
      [
        { id: "active-1", started_at: "2026-03-20T10:00:00Z" },
        { id: "mar-2", started_at: "2026-03-12T10:00:00Z" },
        { id: "mar-1", started_at: "2026-03-01T10:00:00Z" },
        { id: "jan-1", started_at: "2026-01-15T10:00:00Z" },
      ],
      "active-1",
    )

    expect(months).toHaveLength(2)
    expect(months[0].key).toBe("2026-03")
    expect(months[0].sessions.map((session) => session.id)).toEqual(["mar-2", "mar-1"])
    expect(months[1].key).toBe("2026-01")
  })
})
