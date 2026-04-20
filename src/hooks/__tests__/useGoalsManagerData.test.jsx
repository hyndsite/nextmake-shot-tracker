import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"

import { useGoalsManagerData } from "../useGoalsManagerData"
import { listGoalSetsWithGoals } from "../../lib/goals-db"
import { getUser, supabase } from "../../lib/supabase"
import { getActiveAthleteId, listAthletes, setActiveAthlete } from "../../lib/athlete-db"

vi.mock("../../lib/goals-db", () => ({
  listGoalSetsWithGoals: vi.fn(),
  createGoalSet: vi.fn(),
  updateGoalSet: vi.fn(),
  deleteGoalSet: vi.fn(),
  deleteGoalsBySet: vi.fn(),
  createGoal: vi.fn(),
  deleteGoal: vi.fn(),
  archiveGoalSet: vi.fn(),
}))

vi.mock("../../lib/supabase", () => ({
  supabase: { from: vi.fn() },
  getUser: vi.fn(),
}))

vi.mock("../../lib/athlete-db", () => ({
  listAthletes: vi.fn(),
  getActiveAthleteId: vi.fn(),
  setActiveAthlete: vi.fn(),
}))

vi.mock("../../lib/goal-metrics", () => ({
  BASE_METRIC_OPTIONS: [
    { value: "fg_pct_zone", label: "FG% (by zone)" },
    { value: "makes", label: "Makes (count)" },
  ],
  GAME_ONLY_METRIC_OPTIONS: [{ value: "points_total", label: "Total Points (Game)" }],
  ZONE_METRICS: new Set(["fg_pct_zone", "attempts_zone"]),
  metricLabel: vi.fn((metric) => metric),
  zoneLabel: vi.fn((zoneId) => zoneId || null),
}))

function buildSupabaseQuery(data, error = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  }
}

describe("useGoalsManagerData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listAthletes.mockReturnValue([
      { id: "ath-1", first_name: "Ava", last_name: "", initials: "A" },
      { id: "ath-2", first_name: "Max", last_name: "", initials: "M" },
    ])
    getActiveAthleteId.mockReturnValue("ath-1")
    getUser.mockResolvedValue({ id: "user-1" })
    supabase.from.mockImplementation((table) => {
      if (table === "game_events") return buildSupabaseQuery([{ id: "ge-1" }])
      if (table === "practice_entries") return buildSupabaseQuery([{ id: "pe-1" }])
      return buildSupabaseQuery([])
    })
  })

  it("hydrates goal data, derives sorted sets, and picks metric options from the selected set", async () => {
    listGoalSetsWithGoals.mockResolvedValue([
      {
        id: "archived-set",
        name: "Archived Set",
        type: "practice",
        due_date: "2026-03-15",
        archived: true,
        archived_at: "2026-03-20",
        goals: [],
      },
      {
        id: "game-set",
        name: "Game Set",
        type: "game",
        due_date: "2026-03-10",
        archived: false,
        goals: [],
      },
      {
        id: "practice-set",
        name: "Practice Set",
        type: "practice",
        due_date: "2026-03-05",
        archived: false,
        goals: [],
      },
    ])

    const { result } = renderHook(() => useGoalsManagerData())

    await waitFor(() => {
      expect(result.current.lists.loading).toBe(false)
    })

    expect(listGoalSetsWithGoals).toHaveBeenCalledWith({ athleteId: "ath-1" })
    expect(result.current.athlete.activeAthleteId).toBe("ath-1")
    expect(result.current.lists.goalSets).toHaveLength(3)
    expect(result.current.lists.gameEvents).toEqual([{ id: "ge-1" }])
    expect(result.current.lists.practiceEntries).toEqual([{ id: "pe-1" }])
    expect(result.current.lists.activeSorted.map((set) => set.id)).toEqual([
      "practice-set",
      "game-set",
    ])
    expect(result.current.lists.archivedSorted.map((set) => set.id)).toEqual([
      "archived-set",
    ])
    expect(result.current.goalForm.values.selectedSetIdForGoal).toBe("game-set")
    expect(result.current.goalForm.derived.availableMetricOptions.map((option) => option.value)).toEqual([
      "fg_pct_zone",
      "makes",
      "points_total",
    ])
    expect(result.current.athleteActions.selectAthlete).toEqual(expect.any(Function))
    expect(result.current.setActions.handleCreateOrUpdateSet).toEqual(expect.any(Function))
    expect(result.current.goalActions.handleAddGoal).toEqual(expect.any(Function))
    expect(result.current.uiActions.setOpenArchived).toEqual(expect.any(Function))
    expect(result.current.ui.setOpenArchived).toBeUndefined()
  })

  it("selects the first active set when there is no prior selected set", async () => {
    getActiveAthleteId.mockReturnValue("")
    listGoalSetsWithGoals.mockResolvedValue([
      {
        id: "archived-set",
        name: "Archived Set",
        type: "practice",
        due_date: "2026-03-15",
        archived: true,
        archived_at: "2026-03-20",
        goals: [],
      },
      {
        id: "practice-set",
        name: "Practice Set",
        type: "practice",
        due_date: "2026-03-05",
        archived: false,
        goals: [],
      },
      {
        id: "game-set",
        name: "Game Set",
        type: "game",
        due_date: "2026-03-10",
        archived: false,
        goals: [],
      },
    ])

    const { result } = renderHook(() => useGoalsManagerData())

    await waitFor(() => {
      expect(result.current.lists.loading).toBe(false)
    })

    expect(result.current.goalForm.values.selectedSetIdForGoal).toBe("practice-set")
  })

  it("selectAthlete persists and updates the active athlete id", async () => {
    listGoalSetsWithGoals.mockResolvedValue([])

    const { result } = renderHook(() => useGoalsManagerData())

    await waitFor(() => {
      expect(result.current.lists.loading).toBe(false)
    })

    act(() => {
      result.current.athleteActions.selectAthlete("ath-2")
    })

    expect(setActiveAthlete).toHaveBeenCalledWith("ath-2")
    await waitFor(() => {
      expect(result.current.athlete.activeAthleteId).toBe("ath-2")
      expect(listGoalSetsWithGoals).toHaveBeenCalledWith({ athleteId: "ath-2" })
    })
  })

  it("toggleExpanded adds and removes set ids from expansion state", async () => {
    listGoalSetsWithGoals.mockResolvedValue([])

    const { result } = renderHook(() => useGoalsManagerData())

    await waitFor(() => {
      expect(result.current.lists.loading).toBe(false)
    })

    act(() => {
      result.current.uiActions.toggleExpanded("set-1")
    })
    expect(result.current.ui.expandedSetIds.has("set-1")).toBe(true)

    act(() => {
      result.current.uiActions.toggleExpanded("set-1")
    })
    expect(result.current.ui.expandedSetIds.has("set-1")).toBe(false)
  })

  it("startEditSet hydrates the set form and opens the create accordion", async () => {
    listGoalSetsWithGoals.mockResolvedValue([])

    const { result } = renderHook(() => useGoalsManagerData())

    await waitFor(() => {
      expect(result.current.lists.loading).toBe(false)
    })

    act(() => {
      result.current.setActions.startEditSet({
        id: "set-1",
        name: "Playoff Block",
        type: "game",
        start_date: "2026-04-01",
        due_date: "2026-04-15",
      })
    })

    expect(result.current.setForm.values.editingSetId).toBe("set-1")
    expect(result.current.setForm.values.setName).toBe("Playoff Block")
    expect(result.current.setForm.values.setType).toBe("game")
    expect(result.current.setForm.values.setStartDate).toBe("2026-04-01")
    expect(result.current.setForm.values.setDueDate).toBe("2026-04-15")
    expect(result.current.ui.openCreateSet).toBe(true)
  })

  it("resets invalid goal metrics when the selected set changes to practice", async () => {
    listGoalSetsWithGoals.mockResolvedValue([
      {
        id: "game-set",
        name: "Game Set",
        type: "game",
        due_date: "2026-03-10",
        archived: false,
        goals: [],
      },
      {
        id: "practice-set",
        name: "Practice Set",
        type: "practice",
        due_date: "2026-03-05",
        archived: false,
        goals: [],
      },
    ])

    const { result } = renderHook(() => useGoalsManagerData())

    await waitFor(() => {
      expect(result.current.lists.loading).toBe(false)
    })

    act(() => {
      result.current.goalForm.actions.setGoalMetric("points_total")
    })
    expect(result.current.goalForm.values.goalMetric).toBe("points_total")

    act(() => {
      result.current.goalForm.actions.setSelectedSetIdForGoal("practice-set")
    })

    await waitFor(() => {
      expect(result.current.goalForm.values.goalMetric).toBe("fg_pct_zone")
    })
    expect(result.current.goalForm.derived.availableMetricOptions.map((option) => option.value)).toEqual([
      "fg_pct_zone",
      "makes",
    ])
  })
})
