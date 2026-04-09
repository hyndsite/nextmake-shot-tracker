import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import PracticeStartPanel from "../PracticeStartPanel"

vi.mock("lucide-react", () => ({
  ArrowLeftRight: () => <span>{"<>"}</span>,
}))

describe("PracticeStartPanel", () => {
  it("renders active athlete state and forwards chooser interactions", async () => {
    const user = userEvent.setup()
    const setShowSwitchAthlete = vi.fn()
    const startForSelectedAthlete = vi.fn()
    const setSelectedAthleteId = vi.fn()
    const setActiveAthlete = vi.fn()

    render(
      <PracticeStartPanel
        selectedAthlete={{
          id: "ath-1",
          first_name: "Max",
          last_name: "McCarty",
          initials: "MM",
          avatar_color: "#BFDBFE",
        }}
        athletes={[
          {
            id: "ath-1",
            first_name: "Max",
            last_name: "McCarty",
            initials: "MM",
            avatar_color: "#BFDBFE",
          },
          {
            id: "ath-2",
            first_name: "Jane",
            last_name: "Doe",
            initials: "JD",
            avatar_color: "#BFDBFE",
          },
        ]}
        selectedAthleteId="ath-1"
        canStartForSelectedAthlete
        showSwitchAthlete
        setShowSwitchAthlete={setShowSwitchAthlete}
        startForSelectedAthlete={startForSelectedAthlete}
        setSelectedAthleteId={setSelectedAthleteId}
        setActiveAthlete={setActiveAthlete}
      />,
    )

    expect(screen.getByText("Active athlete")).toBeInTheDocument()
    expect(screen.getAllByText("Max McCarty")).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Start session for active athlete" })).toBeEnabled()

    await user.click(screen.getByRole("button", { name: "Start session for active athlete" }))
    expect(startForSelectedAthlete).toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Switch athlete for session" }))
    expect(setShowSwitchAthlete).toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Jane Doe" }))
    expect(setSelectedAthleteId).toHaveBeenCalledWith("ath-2")
    expect(setActiveAthlete).toHaveBeenCalledWith("ath-2")
    expect(setShowSwitchAthlete).toHaveBeenCalledWith(false)
  })

  it("shows the no-athlete message and disables start when no athlete is selected", () => {
    render(
      <PracticeStartPanel
        selectedAthlete={null}
        athletes={[]}
        selectedAthleteId=""
        canStartForSelectedAthlete={false}
        showSwitchAthlete={false}
        setShowSwitchAthlete={vi.fn()}
        startForSelectedAthlete={vi.fn()}
        setSelectedAthleteId={vi.fn()}
        setActiveAthlete={vi.fn()}
      />,
    )

    expect(screen.getByText("No athlete profiles found. Add one from Dashboard first.")).toBeInTheDocument()
    expect(screen.getByText("No active athlete")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Start session for active athlete" })).toBeDisabled()
  })
})
