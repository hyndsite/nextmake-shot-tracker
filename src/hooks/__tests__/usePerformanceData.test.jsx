import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"

import { usePerformanceData } from "../usePerformanceData"
import { getGamePerformance, getPracticePerformance } from "../../lib/performance-db"
import { getActiveAthleteId, listAthletes, setActiveAthlete } from "../../lib/athlete-db"

vi.mock("../../lib/performance-db", () => ({
  getGamePerformance: vi.fn(),
  getPracticePerformance: vi.fn(),
}))

vi.mock("../../lib/athlete-db", () => ({
  listAthletes: vi.fn(),
  getActiveAthleteId: vi.fn(),
  setActiveAthlete: vi.fn(),
}))

const mockPerformanceData = {
  metrics: [],
  trend: [],
  overallFgPct: 0,
  overallEfgPct: 0,
  totalAttempts: 10,
  trendBuckets: { daily: [], weekly: [], monthly: [] },
}

describe("usePerformanceData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null)
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {})
    listAthletes.mockReturnValue([
      { id: "ath-1", first_name: "Maya", last_name: "One" },
      { id: "ath-2", first_name: "Jai", last_name: "Two" },
    ])
    getActiveAthleteId.mockReturnValue("ath-1")
    getGamePerformance.mockResolvedValue(mockPerformanceData)
    getPracticePerformance.mockResolvedValue(mockPerformanceData)
  })

  it("hydrates athlete state and loads both performance sources", async () => {
    const { result } = renderHook(() => usePerformanceData())

    await waitFor(() => {
      expect(getGamePerformance).toHaveBeenCalledWith(
        expect.objectContaining({ athleteId: "ath-1", days: 30, shotType: "all", contested: "all" }),
      )
      expect(getPracticePerformance).toHaveBeenCalledWith(
        expect.objectContaining({ athleteId: "ath-1", days: 30, shotType: "all", contested: "all" }),
      )
    })

    expect(result.current.athletes).toHaveLength(2)
    expect(result.current.activeAthleteId).toBe("ath-1")
  })

  it("updates active athlete and persists accordion state", async () => {
    const { result } = renderHook(() => usePerformanceData())

    await waitFor(() => {
      expect(getGamePerformance).toHaveBeenCalled()
    })

    await act(async () => {
      result.current.handleSelectAthlete("ath-2")
      result.current.toggleGameExpanded()
    })

    await waitFor(() => {
      expect(setActiveAthlete).toHaveBeenCalledWith("ath-2")
      expect(result.current.activeAthleteId).toBe("ath-2")
      expect(localStorage.setItem).toHaveBeenCalledWith("nm_perf_game_expanded", "false")
    })
  })
})
