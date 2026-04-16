import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useHeatmapData } from "../useHeatmapData"
import { supabase, getUser } from "../../lib/supabase"
import {
  getActiveAthleteId,
  listAthletes,
  setActiveAthlete,
} from "../../lib/athlete-db"

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
  getUser: vi.fn(),
}))

vi.mock("../../lib/athlete-db", () => ({
  listAthletes: vi.fn(),
  getActiveAthleteId: vi.fn(),
  setActiveAthlete: vi.fn(),
}))

describe("useHeatmapData", () => {
  let mockQuery

  beforeEach(() => {
    vi.clearAllMocks()

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn(),
    }

    supabase.from.mockReturnValue(mockQuery)
    getUser.mockResolvedValue({ id: "user-1" })
    listAthletes.mockReturnValue([
      { id: "ath-1", first_name: "Ava", last_name: "One" },
      { id: "ath-2", first_name: "Max", last_name: "Two" },
    ])
    getActiveAthleteId.mockReturnValue("ath-1")
    mockQuery.gte.mockResolvedValue({
      data: [
        {
          zone_id: "left_corner_3",
          shot_type: "Catch & Shoot",
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ],
      error: null,
    })
  })

  it("hydrates athlete and heatmap state and loads zones", async () => {
    const { result } = renderHook(() => useHeatmapData())

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("game_events")
      expect(mockQuery.eq).toHaveBeenCalledWith("athlete_id", "ath-1")
    })

    expect(result.current.athletes).toHaveLength(2)
    expect(result.current.activeAthleteId).toBe("ath-1")
    expect(result.current.rangeId).toBe("180d")
    expect(result.current.zones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "left_corner_3",
          attempts: 1,
          makes: 1,
        }),
      ]),
    )
    expect(result.current.totalAttempts).toBe(1)
  })

  it("switches athletes and refetches heatmap data", async () => {
    const { result } = renderHook(() => useHeatmapData())

    await waitFor(() => {
      expect(mockQuery.eq).toHaveBeenCalledWith("athlete_id", "ath-1")
    })

    vi.clearAllMocks()
    supabase.from.mockReturnValue(mockQuery)
    mockQuery.gte.mockResolvedValue({ data: [], error: null })

    await act(async () => {
      result.current.handleSelectAthlete("ath-2")
    })

    await waitFor(() => {
      expect(setActiveAthlete).toHaveBeenCalledWith("ath-2")
      expect(result.current.activeAthleteId).toBe("ath-2")
      expect(mockQuery.eq).toHaveBeenCalledWith("athlete_id", "ath-2")
    })
  })
})
