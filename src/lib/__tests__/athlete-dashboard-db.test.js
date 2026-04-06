import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  listAthleteDashboardMetrics,
  replaceAthleteDashboardMetrics,
} from "../athlete-dashboard-db.js"

vi.mock("../supabase.js", () => ({
  supabase: {
    from: vi.fn(),
  },
  getUser: vi.fn(),
}))

describe("athlete-dashboard-db", () => {
  let mockSupabase
  let mockGetUser

  beforeEach(async () => {
    vi.clearAllMocks()
    const supabaseModule = await import("../supabase.js")
    mockSupabase = supabaseModule.supabase
    mockGetUser = supabaseModule.getUser
    mockGetUser.mockResolvedValue({ id: "user-1" })
  })

  it("lists enabled metrics by default", async () => {
    const mockRows = [
      {
        id: "m1",
        metric_key: "efg_overall",
        range_key: "7d",
        source_mode: "both",
        position: 0,
        enabled: true,
      },
    ]
    const ownershipQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "ath-1" }, error: null }),
    }
    const metricsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    }
    metricsQuery.eq.mockImplementation((column, value) => {
      if (column === "enabled" && value === true) {
        return Promise.resolve({ data: mockRows, error: null })
      }
      return metricsQuery
    })
    mockSupabase.from.mockImplementation((table) => {
      if (table === "athlete_profiles") return ownershipQuery
      return metricsQuery
    })

    const rows = await listAthleteDashboardMetrics({ athleteId: "ath-1" })

    expect(rows).toEqual(mockRows)
    expect(mockSupabase.from).toHaveBeenCalledWith("athlete_profiles")
    expect(mockSupabase.from).toHaveBeenCalledWith("athlete_dashboard_metrics")
    expect(metricsQuery.eq).toHaveBeenCalledWith("enabled", true)
  })

  it("falls back when source_mode column is missing", async () => {
    const legacyRows = [
      {
        id: "m1",
        athlete_id: "ath-1",
        metric_key: "efg_overall",
        range_key: "7d",
        position: 0,
        enabled: true,
      },
    ]

    const ownershipQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "ath-1" }, error: null }),
    }
    const withSourceModeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    }
    withSourceModeQuery.eq.mockImplementation((column, value) => {
      if (column === "enabled" && value === true) {
        return Promise.resolve({
          data: null,
          error: {
            code: "42703",
            message: "column athlete_dashboard_metrics.source_mode does not exist",
          },
        })
      }
      return withSourceModeQuery
    })

    const legacyQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    }
    legacyQuery.eq.mockImplementation((column, value) => {
      if (column === "enabled" && value === true) {
        return Promise.resolve({ data: legacyRows, error: null })
      }
      return legacyQuery
    })

    let dashboardReadCount = 0
    mockSupabase.from.mockImplementation((table) => {
      if (table === "athlete_profiles") return ownershipQuery
      if (table === "athlete_dashboard_metrics") {
        dashboardReadCount += 1
        return dashboardReadCount === 1 ? withSourceModeQuery : legacyQuery
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const rows = await listAthleteDashboardMetrics({ athleteId: "ath-1" })

    expect(rows).toEqual([
      expect.objectContaining({
        id: "m1",
        metric_key: "efg_overall",
        range_key: "7d",
        source_mode: "both",
        position: 0,
        enabled: true,
      }),
    ])
    expect(withSourceModeQuery.select).toHaveBeenCalledWith(
      "*"
    )
    expect(legacyQuery.select).toHaveBeenCalledWith(
      "id, athlete_id, metric_key, range_key, position, enabled, created_at, updated_at"
    )
  })

  it("replaces metrics with delete then insert", async () => {
    const insertedRows = [
      {
        id: "m1",
        athlete_id: "ath-1",
        metric_key: "efg_overall",
        range_key: "7d",
        source_mode: "both",
        position: 0,
        enabled: true,
      },
    ]

    let capturedPayload = null
    let callCount = 0
    mockSupabase.from.mockImplementation((table) => {
      if (table === "athlete_profiles") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: "ath-1" }, error: null }),
              }),
            }),
          }),
        }
      }
      callCount += 1
      if (callCount === 1) {
        return {
          delete: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }),
        }
      }
      return {
        insert: (payload) => {
          capturedPayload = payload
          return {
            select: () => ({
              order: () => Promise.resolve({ data: insertedRows, error: null }),
            }),
          }
        },
      }
    })

    const rows = await replaceAthleteDashboardMetrics("ath-1", [
      { metricKey: "efg_overall", rangeKey: "7d", position: 0 },
    ])

    expect(rows).toEqual(insertedRows)
    expect(mockSupabase.from).toHaveBeenCalledWith("athlete_dashboard_metrics")
    expect(capturedPayload).toEqual([
      expect.objectContaining({
        metric_key: "efg_overall",
        range_key: "7d",
        source_mode: "both",
      }),
    ])
  })

  it("rejects more than 5 selected metrics", async () => {
    await expect(
      replaceAthleteDashboardMetrics("ath-1", [
        { metricKey: "a", rangeKey: "7d", position: 0 },
        { metricKey: "b", rangeKey: "7d", position: 1 },
        { metricKey: "c", rangeKey: "7d", position: 2 },
        { metricKey: "d", rangeKey: "7d", position: 3 },
        { metricKey: "e", rangeKey: "7d", position: 4 },
        { metricKey: "f", rangeKey: "7d", position: 0 },
      ]),
    ).rejects.toThrow("at most 5")
  })

  it("rejects invalid range key", async () => {
    await expect(
      replaceAthleteDashboardMetrics("ath-1", [
        { metricKey: "efg_overall", rangeKey: "14d", position: 0 },
      ]),
    ).rejects.toThrow("valid rangeKey")
  })

  it("rejects invalid source mode", async () => {
    await expect(
      replaceAthleteDashboardMetrics("ath-1", [
        { metricKey: "efg_overall", rangeKey: "7d", sourceMode: "all", position: 0 },
      ]),
    ).rejects.toThrow("valid sourceMode")
  })

  it("throws when unauthenticated", async () => {
    mockGetUser.mockResolvedValue(null)

    await expect(
      listAthleteDashboardMetrics({ athleteId: "ath-1" }),
    ).rejects.toThrow("No authenticated user")
  })

  it("throws when athlete is not owned by user", async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === "athlete_profiles") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }
    })

    await expect(
      listAthleteDashboardMetrics({ athleteId: "ath-x" }),
    ).rejects.toThrow("Athlete does not belong to the authenticated user")
  })
})
