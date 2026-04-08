import { describe, expect, it, beforeEach, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

import { useDashboardData } from "../useDashboardData"
import { listAthleteProfiles } from "../../lib/athlete-profiles-db"
import { listAthleteDashboardMetrics } from "../../lib/athlete-dashboard-db"
import { listGoalSetsWithGoals } from "../../lib/goals-db"
import { getUser, supabase } from "../../lib/supabase"

vi.mock("../../lib/athlete-profiles-db", () => ({
  listAthleteProfiles: vi.fn(),
}))

vi.mock("../../lib/athlete-dashboard-db", () => ({
  listAthleteDashboardMetrics: vi.fn(),
}))

vi.mock("../../lib/goals-db", () => ({
  listGoalSetsWithGoals: vi.fn(),
}))

vi.mock("../../lib/supabase", () => ({
  getUser: vi.fn(),
  supabase: {
    from: vi.fn(),
  },
}))

function buildOrderResult(data) {
  return Promise.resolve({ data, error: null })
}

function buildSupabaseQuery(data) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(() => buildOrderResult(data)),
  }
}

describe("useDashboardData", () => {
  beforeEach(() => {
    localStorage.clear()
    listGoalSetsWithGoals.mockResolvedValue([])
    getUser.mockResolvedValue({ id: "user-1" })
    supabase.from.mockImplementation(() => buildSupabaseQuery([]))
  })

  it("hydrates athletes and loads dashboard metrics for the active athlete", async () => {
    listAthleteProfiles.mockResolvedValueOnce([
      {
        id: "remote_zoe",
        first_name: "Zoe",
        last_name: "Smith",
        initials: "ZS",
        avatar_color: "#BFDBFE",
        created_at: new Date().toISOString(),
        archived_at: null,
      },
    ])
    listAthleteDashboardMetrics.mockResolvedValueOnce([
      {
        id: "dm-1",
        athlete_id: "remote_zoe",
        metric_key: "efg_overall",
        range_key: "7d",
        source_mode: "both",
        position: 0,
        enabled: true,
      },
    ])

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => {
      expect(result.current.activeAthlete?.id).toBe("remote_zoe")
    })

    expect(result.current.athletes).toHaveLength(1)
    expect(result.current.dashboardMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "dm-1",
          metric_key: "efg_overall",
        }),
      ]),
    )
    expect(listAthleteDashboardMetrics).toHaveBeenCalledWith({
      athleteId: "remote_zoe",
      includeDisabled: true,
    })
  })

  it("surfaces an athlete hydration error", async () => {
    listAthleteProfiles.mockRejectedValueOnce(new Error("Unable to load athletes"))

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => {
      expect(result.current.athletesError).toBe("Unable to load athletes")
    })
  })
})
