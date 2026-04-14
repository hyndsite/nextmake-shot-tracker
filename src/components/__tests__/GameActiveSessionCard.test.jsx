import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import GameActiveSessionCard from "../GameActiveSessionCard"

vi.mock("lucide-react", () => ({
  PlayCircle: () => <span>play</span>,
}))

describe("GameActiveSessionCard", () => {
  it("renders active game details and forwards resume action", async () => {
    const user = userEvent.setup()
    const onResume = vi.fn()

    render(
      <GameActiveSessionCard
        activeGame={{
          team_name: "Warriors",
          opponent_name: "Lakers",
          home_away: "home",
        }}
        homeAwayPill={() => <span>Home</span>}
        onResume={onResume}
      />,
    )

    expect(screen.getByText("Resume Active Game")).toBeInTheDocument()
    expect(screen.getByText("Warriors vs Lakers")).toBeInTheDocument()
    expect(screen.getByText("Home")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Resume" }))
    expect(onResume).toHaveBeenCalled()
  })
})
