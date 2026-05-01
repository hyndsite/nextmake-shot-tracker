import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"

import { useGameGateScreen } from "../useGameGateScreen.jsx"
import { useGameGateData } from "../useGameGateData"
import {
  deleteGameSession,
  endGameSession,
} from "../../lib/game-db"

vi.mock("../useGameGateData", () => ({
  useGameGateData: vi.fn(),
}))

vi.mock("../../lib/game-db", () => ({
  deleteGameSession: vi.fn(),
  endGameSession: vi.fn(),
}))

describe("useGameGateScreen", () => {
  const refresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    refresh.mockResolvedValue(undefined)
    useGameGateData.mockReturnValue({
      sessions: [],
      active: null,
      previous: [],
      groupedPrev: new Map([
        [
          "Varsity",
          [
            {
              id: "game-1",
              team_name: "Warriors",
              opponent_name: "Bulls",
              home_away: "away",
              date_iso: "2025-01-10T00:00:00.000Z",
              team_score: 80,
              opponent_score: 75,
            },
          ],
        ],
      ]),
      refresh,
    })
    endGameSession.mockResolvedValue({})
    deleteGameSession.mockResolvedValue({})
    vi.spyOn(window, "confirm").mockReturnValue(true)
    vi.spyOn(window, "alert").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  it("returns grouped state and opens start flow directly when no active game exists", () => {
    const navigate = vi.fn()
    const { result } = renderHook(() => useGameGateScreen({ navigate }))

    expect(result.current.data.groupedPrev).toBeInstanceOf(Map)
    expect(result.current.startUi.showConfirmNew).toBe(false)
    expect(result.current.display.computeResultSummary).toBeTypeOf("function")
    expect(result.current.startActions).toBeDefined()
    expect(result.current.modalActions).toBeDefined()
    expect(result.current.historyActions).toBeDefined()

    act(() => {
      result.current.startActions.startNew()
    })

    expect(navigate).toHaveBeenCalledWith("game-new")
  })

  it("opens confirm state when starting with an active game", () => {
    const navigate = vi.fn()
    useGameGateData.mockReturnValueOnce({
      sessions: [],
      active: { id: "active-1", started_at: "2025-01-12T10:00:00.000Z" },
      previous: [],
      groupedPrev: new Map(),
      refresh,
    })

    const { result } = renderHook(() => useGameGateScreen({ navigate }))

    act(() => {
      result.current.startActions.startNew()
    })

    expect(result.current.startUi.showConfirmNew).toBe(true)
    expect(navigate).not.toHaveBeenCalled()
  })

  it("confirms end-and-start and resumes active game", async () => {
    const navigate = vi.fn()
    useGameGateData.mockReturnValueOnce({
      sessions: [],
      active: { id: "active-1", started_at: "2025-01-12T10:00:00.000Z" },
      previous: [],
      groupedPrev: new Map(),
      refresh,
    })

    const { result } = renderHook(() => useGameGateScreen({ navigate }))

    await act(async () => {
      await result.current.modalActions.confirmEndAndStart()
    })
    act(() => {
      result.current.startActions.resumeActive()
    })

    expect(endGameSession).toHaveBeenCalledWith("active-1")
    expect(navigate).toHaveBeenCalledWith("game-new")
    expect(navigate).toHaveBeenCalledWith("game-logger", { id: "active-1" })
  })

  it("opens detail and deletes a game with refresh", async () => {
    const navigate = vi.fn()
    const { result } = renderHook(() => useGameGateScreen({ navigate }))

    act(() => {
      result.current.historyActions.openDetail("game-1")
    })

    await act(async () => {
      await result.current.historyActions.deleteGame("game-1", {
        stopPropagation: vi.fn(),
      })
    })

    expect(navigate).toHaveBeenCalledWith("gameDetail", { id: "game-1" })
    expect(deleteGameSession).toHaveBeenCalledWith("game-1")
    expect(refresh).toHaveBeenCalled()
  })

  it("alerts when delete fails", async () => {
    const navigate = vi.fn()
    deleteGameSession.mockRejectedValueOnce(new Error("fail"))
    const { result } = renderHook(() => useGameGateScreen({ navigate }))

    await act(async () => {
      await result.current.historyActions.deleteGame("game-1", {
        stopPropagation: vi.fn(),
      })
    })

    expect(console.warn).toHaveBeenCalled()
    expect(window.alert).toHaveBeenCalledWith(
      "Could not delete game on this device.",
    )
  })

  it("dismisses the confirm modal through modalActions", () => {
    const navigate = vi.fn()
    useGameGateData.mockReturnValueOnce({
      sessions: [],
      active: { id: "active-1", started_at: "2025-01-12T10:00:00.000Z" },
      previous: [],
      groupedPrev: new Map(),
      refresh,
    })

    const { result } = renderHook(() => useGameGateScreen({ navigate }))

    act(() => {
      result.current.startActions.startNew()
    })
    expect(result.current.startUi.showConfirmNew).toBe(true)

    act(() => {
      result.current.modalActions.dismissConfirmNew()
    })
    expect(result.current.startUi.showConfirmNew).toBe(false)
  })
})
