import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import GameHistorySection from "../GameHistorySection"

vi.mock("lucide-react", () => ({
  ChevronDown: () => <span>chevron</span>,
  Gamepad2: () => <span>game</span>,
  Trash2: () => <span>trash</span>,
}))

describe("GameHistorySection", () => {
  it("renders grouped previous games and forwards open/delete actions", async () => {
    const user = userEvent.setup()
    const openDetail = vi.fn()
    const onDelete = vi.fn()

    render(
      <GameHistorySection
        groupedPrev={new Map([
          [
            "Varsity",
            [
              {
                id: "game-1",
                team_name: "Warriors",
                opponent_name: "Bulls",
                home_away: "away",
                date_iso: "2025-01-10T00:00:00.000Z",
                team_score: 80,
                opponent_score: 75,
              },
            ],
          ],
        ])}
        computeResultSummary={() => ({ letter: "W", team: 80, opp: 75 })}
        fmtDate={() => "Jan 10, 2025"}
        homeAwayPill={() => <span>Away</span>}
        openDetail={openDetail}
        onDelete={onDelete}
      />,
    )

    expect(screen.getByText("Previous Games")).toBeInTheDocument()
    const groupButton = screen.getByRole("button", { name: "Varsity" })
    const groupSection = groupButton.closest("section")
    expect(groupSection).not.toBeNull()
    expect(groupSection.className).toContain("rounded-2xl")

    await user.click(groupButton)
    expect(
      screen.queryByRole("button", { name: /Warriors vs Bulls on Jan 10, 2025/i }),
    ).not.toBeInTheDocument()

    await user.click(groupButton)

    const card = screen.getByRole("button", {
      name: /Warriors vs Bulls on Jan 10, 2025/i,
    })
    expect(card).toHaveTextContent("Warriors vs. Bulls")
    expect(card).toHaveTextContent("W | 80 - 75")

    await user.click(card)
    expect(openDetail).toHaveBeenCalledWith("game-1")

    const deleteButton = within(card).getByRole("button", { name: "Delete game" })
    await user.click(deleteButton)
    expect(onDelete).toHaveBeenCalledWith("game-1", expect.any(Object))
  })
})
