import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import Dashboard from "../Dashboard"
import {
  archiveAthleteProfile,
  createAthleteProfile,
  listAthleteProfiles,
} from "../../lib/athlete-profiles-db"

vi.mock("lucide-react", () => ({
  Plus: () => <span>+</span>,
  ArrowLeftRight: () => <span>{"<>"}</span>,
  Archive: () => <span>{"[]"}</span>,
}))

vi.mock("../../lib/athlete-profiles-db", () => ({
  createAthleteProfile: vi.fn(),
  archiveAthleteProfile: vi.fn(),
  listAthleteProfiles: vi.fn(),
}))

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
    vi.spyOn(window, "confirm").mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("shows dashboard helper text", async () => {
    render(<Dashboard />)

    expect(
      screen.getByText("Use the bottom navigation to jump to Practice or Game for this active athlete.")
    ).toBeInTheDocument()
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
})
