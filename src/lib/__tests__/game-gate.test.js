import { describe, expect, it } from "vitest"

import {
  groupPreviousGamesByLevel,
  listPreviousGameSessions,
} from "../game-gate"

describe("game-gate", () => {
  it("filters previous sessions and groups them by level", () => {
    const sessions = [
      { id: "game-1", level: "Varsity", date_iso: "2025-01-10T00:00:00.000Z", status: "completed" },
      { id: "game-2", level: "Varsity", date_iso: "2025-01-08T00:00:00.000Z", status: "completed" },
      { id: "game-3", level: null, started_at: "2025-01-09T00:00:00.000Z", status: "completed" },
      { id: "active-1", status: "active" },
    ]

    const previous = listPreviousGameSessions(sessions)
    const grouped = groupPreviousGamesByLevel(previous)

    expect(previous.map((session) => session.id)).toEqual(["game-1", "game-2", "game-3"])
    expect(Array.from(grouped.keys())).toEqual(["Varsity", "Games"])
    expect(grouped.get("Varsity").map((session) => session.id)).toEqual(["game-1", "game-2"])
    expect(grouped.get("Games").map((session) => session.id)).toEqual(["game-3"])
  })
})
