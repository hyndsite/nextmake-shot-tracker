import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

import { useGameGateData } from "../useGameGateData"
import {
  getActiveGameSession,
  listGameSessions,
} from "../../lib/game-db"

vi.mock("../../lib/game-db", () => ({
  getActiveGameSession: vi.fn(),
  listGameSessions: vi.fn(),
}))

describe("useGameGateData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getActiveGameSession.mockResolvedValue(null)
  })

  it("hydrates sessions and groups completed games by level", async () => {
    listGameSessions.mockResolvedValue([
      {
        id: "game-1",
        level: "Varsity",
        date_iso: "2025-01-10T00:00:00.000Z",
        status: "completed",
      },
      {
        id: "game-2",
        level: "Varsity",
        date_iso: "2025-01-08T00:00:00.000Z",
        status: "completed",
      },
      {
        id: "game-3",
        level: null,
        started_at: "2025-01-09T00:00:00.000Z",
        status: "completed",
      },
      {
        id: "active-1",
        status: "active",
      },
    ])

    const { result } = renderHook(() => useGameGateData())

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(4)
    })

    expect(result.current.previous).toHaveLength(3)
    expect(Array.from(result.current.groupedPrev.keys())).toEqual(["Varsity", "Games"])
    expect(result.current.groupedPrev.get("Varsity").map((game) => game.id)).toEqual([
      "game-1",
      "game-2",
    ])
  })

  it("hydrates the active game", async () => {
    getActiveGameSession.mockResolvedValue({
      id: "active-1",
      team_name: "Warriors",
      opponent_name: "Lakers",
      status: "active",
    })
    listGameSessions.mockResolvedValue([])

    const { result } = renderHook(() => useGameGateData())

    await waitFor(() => {
      expect(result.current.active?.id).toBe("active-1")
    })
  })
})
