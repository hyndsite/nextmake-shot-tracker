import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import Dashboard from "../Dashboard"
import {
  archiveAthleteProfile,
  createAthleteProfile,
  listAthleteProfiles,
} from "../../lib/athlete-profiles-db"
import {
  listAthleteDashboardMetrics,
  replaceAthleteDashboardMetrics,
} from "../../lib/athlete-dashboard-db"
import { listGoalSetsWithGoals } from "../../lib/goals-db"
import { getUser, supabase } from "../../lib/supabase"

vi.mock("lucide-react", () => ({
  Plus: () => <span>+</span>,
  ArrowLeftRight: () => <span>{"<>"}</span>,
  Archive: () => <span>{"[]"}</span>,
}))

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Line: () => null,
}))

vi.mock("../../lib/athlete-profiles-db", () => ({
  createAthleteProfile: vi.fn(),
  archiveAthleteProfile: vi.fn(),
  listAthleteProfiles: vi.fn(),
}))

vi.mock("../../lib/goals-db", () => ({
  listGoalSetsWithGoals: vi.fn(),
}))

vi.mock("../../lib/athlete-dashboard-db", () => ({
  listAthleteDashboardMetrics: vi.fn(),
  replaceAthleteDashboardMetrics: vi.fn(),
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

describe("Dashboard", () => {
  beforeEach(() => {
    localStorage.clear()
    createAthleteProfile.mockImplementation(async ({ firstName, lastName }) => ({
      id: `remote_${firstName.toLowerCase()}`,
      first_name: firstName,
      last_name: lastName || "",
      initials: `${firstName.slice(0, 1)}${(lastName || "").slice(0, 1)}`.toUpperCase() || "A",
      avatar_color: "#BFDBFE",
      created_at: new Date().toISOString(),
      archived_at: null,
    }))
    archiveAthleteProfile.mockResolvedValue({ id: "remote_max" })
    listAthleteProfiles.mockResolvedValue([])
    listAthleteDashboardMetrics.mockResolvedValue([])
    replaceAthleteDashboardMetrics.mockResolvedValue([])
    listGoalSetsWithGoals.mockResolvedValue([])
    getUser.mockResolvedValue(null)
    supabase.from.mockImplementation(() => buildSupabaseQuery([]))
    vi.spyOn(window, "confirm").mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("does not show the dashboard helper text card", async () => {
    render(<Dashboard />)

    expect(
      screen.queryByText("Use the bottom navigation to jump to Practice or Game for this active athlete.")
    ).not.toBeInTheDocument()
    await waitFor(() => {
      expect(listAthleteProfiles).toHaveBeenCalled()
    })
  })

  it("hydrates athletes from Supabase on load", async () => {
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

    render(<Dashboard />)

    expect(await screen.findByText("Zoe Smith")).toBeInTheDocument()
  })

  it("adds athlete inline and shows active profile", async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await user.click(screen.getByLabelText("Open add athlete"))
    await user.type(screen.getByLabelText("First name"), "Max")
    await user.type(screen.getByLabelText("Last name (optional)"), "McCarty")
    await user.click(screen.getByRole("button", { name: "Add athlete" }))

    expect(createAthleteProfile).toHaveBeenCalledWith({
      firstName: "Max",
      lastName: "McCarty",
    })
    expect(screen.getByText("Max McCarty")).toBeInTheDocument()
  })

  it("switches active athlete from selector", async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await user.click(screen.getByLabelText("Open add athlete"))
    await user.type(screen.getByLabelText("First name"), "Max")
    await user.click(screen.getByRole("button", { name: "Add athlete" }))

    await user.click(screen.getByLabelText("Open add athlete"))
    await user.type(screen.getByLabelText("First name"), "Ava")
    await user.click(screen.getByRole("button", { name: "Add athlete" }))

    await user.click(screen.getByLabelText("Switch athlete"))
    await user.click(screen.getByRole("button", { name: /Ava/i }))

    expect(screen.getByText("Ava")).toBeInTheDocument()
  })

  it("archives the active athlete without deleting other athletes", async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await user.click(screen.getByLabelText("Open add athlete"))
    await user.type(screen.getByLabelText("First name"), "Max")
    await user.click(screen.getByRole("button", { name: "Add athlete" }))

    await user.click(screen.getByLabelText("Open add athlete"))
    await user.type(screen.getByLabelText("First name"), "Ava")
    await user.click(screen.getByRole("button", { name: "Add athlete" }))

    await user.click(screen.getByLabelText("Archive athlete"))

    expect(archiveAthleteProfile).toHaveBeenCalledWith("remote_ava")
    expect(screen.getByText("Max")).toBeInTheDocument()
    expect(screen.queryByText("Ava")).not.toBeInTheDocument()
  })

  it("uses a mobile-safe actions group for active athlete controls", async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(listAthleteProfiles).toHaveBeenCalled()
    })

    const actionsGroup = screen.getByRole("group", {
      name: "Active athlete actions",
    })
    expect(actionsGroup.className).toContain("shrink-0")
    expect(actionsGroup.className).toContain("justify-end")
  })

  it("shows remaining metric count in dashboard metrics header", async () => {
    render(<Dashboard />)

    expect(await screen.findByRole("button", { name: "+ Add Metric" })).toBeInTheDocument()
    expect(screen.getByText("Add up to 5 metrics")).toBeInTheDocument()
  })

  it("auto-saves configured metric rows from the customize drawer", async () => {
    const user = userEvent.setup()
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

    render(<Dashboard />)

    expect(screen.queryByRole("button", { name: "Customize Dashboard" })).not.toBeInTheDocument()
    await user.click(await screen.findByRole("button", { name: "+ Add Metric" }))
    expect(screen.getByRole("heading", { name: "Customize Dashboard" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save Dashboard Settings" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Add metric" }))
    await user.selectOptions(screen.getByLabelText("Metric"), "efg_overall")
    await user.click(screen.getByLabelText("Practice"))

    await waitFor(() => {
      expect(replaceAthleteDashboardMetrics).toHaveBeenCalledWith(
        "remote_zoe",
        expect.arrayContaining([
          expect.objectContaining({
            metricKey: "efg_overall",
            rangeKey: "7d",
            sourceMode: "game",
          }),
        ]),
      )
    })
  })

  it("renders configured metric cards on dashboard", async () => {
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

    render(<Dashboard />)

    expect(await screen.findByText("eFG% (overall)")).toBeInTheDocument()
    expect(screen.getByText(/Game vs Practice/)).toBeInTheDocument()
    expect(screen.getByText("Add up to 4 metrics")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "+ Add Metric" })).toBeInTheDocument()
  })

  it("shows max message when 5 metrics are configured", async () => {
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
      { id: "dm-1", athlete_id: "remote_zoe", metric_key: "efg_overall", range_key: "7d", source_mode: "both", position: 0, enabled: true },
      { id: "dm-2", athlete_id: "remote_zoe", metric_key: "fg_overall", range_key: "7d", source_mode: "both", position: 1, enabled: true },
      { id: "dm-3", athlete_id: "remote_zoe", metric_key: "attempts_total", range_key: "7d", source_mode: "both", position: 2, enabled: true },
      { id: "dm-4", athlete_id: "remote_zoe", metric_key: "makes_total", range_key: "7d", source_mode: "both", position: 3, enabled: true },
      { id: "dm-5", athlete_id: "remote_zoe", metric_key: "pct_three_share", range_key: "7d", source_mode: "both", position: 4, enabled: true },
    ])

    render(<Dashboard />)

    expect(await screen.findByText("Max number metrics reached")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "+ Add Metric" })).not.toBeInTheDocument()
  })

  it("removes a configured metric from dashboard card action", async () => {
    const user = userEvent.setup()
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
    replaceAthleteDashboardMetrics.mockResolvedValueOnce([])

    render(<Dashboard />)

    await user.click(await screen.findByRole("button", { name: "Remove eFG% (overall)" }))

    expect(replaceAthleteDashboardMetrics).toHaveBeenCalledWith("remote_zoe", [])
  })
})
