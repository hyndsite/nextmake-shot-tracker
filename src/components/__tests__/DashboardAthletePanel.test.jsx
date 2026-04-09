import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import DashboardAthletePanel from "../DashboardAthletePanel"

vi.mock("lucide-react", () => ({
  Plus: () => <span>+</span>,
  ArrowLeftRight: () => <span>{"<>"}</span>,
  Archive: () => <span>{"[]"}</span>,
}))

describe("DashboardAthletePanel", () => {
  it("renders athlete controls, switcher, and add form interactions", async () => {
    const user = userEvent.setup()
    const setShowSwitch = vi.fn()
    const setShowAdd = vi.fn()
    const handleArchiveAthlete = vi.fn()
    const handleSelectAthlete = vi.fn()
    const handleAddAthlete = vi.fn((e) => e.preventDefault())
    const setFirstName = vi.fn()
    const setLastName = vi.fn()

    render(
      <DashboardAthletePanel
        activeAthlete={{
          id: "remote_zoe",
          first_name: "Zoe",
          last_name: "Smith",
          initials: "ZS",
          avatar_color: "#BFDBFE",
        }}
        athletes={[
          {
            id: "remote_zoe",
            first_name: "Zoe",
            last_name: "Smith",
            initials: "ZS",
            avatar_color: "#BFDBFE",
          },
          {
            id: "remote_ava",
            first_name: "Ava",
            last_name: "Lopez",
            initials: "AL",
            avatar_color: "#BFDBFE",
          },
        ]}
        activeId="remote_zoe"
        showSwitch
        setShowSwitch={setShowSwitch}
        showAdd
        setShowAdd={setShowAdd}
        firstName="Ma"
        setFirstName={setFirstName}
        lastName="Mc"
        setLastName={setLastName}
        error="Unable to add athlete"
        athletesError=""
        handleSelectAthlete={handleSelectAthlete}
        handleAddAthlete={handleAddAthlete}
        handleArchiveAthlete={handleArchiveAthlete}
      />,
    )

    expect(screen.getByText("Active athlete")).toBeInTheDocument()
    expect(screen.getAllByText("Zoe Smith")).toHaveLength(2)
    expect(screen.getByRole("group", { name: "Active athlete actions" })).toBeInTheDocument()
    expect(screen.getByText("Ava Lopez")).toBeInTheDocument()
    expect(screen.getByText("Unable to add athlete")).toBeInTheDocument()

    await user.click(screen.getByLabelText("Switch athlete"))
    expect(setShowSwitch).toHaveBeenCalled()

    await user.click(screen.getByLabelText("Open add athlete"))
    expect(setShowAdd).toHaveBeenCalled()

    await user.click(screen.getByLabelText("Archive athlete"))
    expect(handleArchiveAthlete).toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Ava Lopez" }))
    expect(handleSelectAthlete).toHaveBeenCalledWith("remote_ava")

    await user.type(screen.getByLabelText("First name"), "x")
    expect(setFirstName).toHaveBeenCalled()

    await user.type(screen.getByLabelText("Last name (optional)"), "y")
    expect(setLastName).toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Add athlete" }))
    expect(handleAddAthlete).toHaveBeenCalled()
  })
})
