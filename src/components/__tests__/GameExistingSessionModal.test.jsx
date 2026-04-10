import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import GameExistingSessionModal from "../GameExistingSessionModal"

describe("GameExistingSessionModal", () => {
  it("renders the active-game warning and forwards actions", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onConfirm = vi.fn()

    render(
      <GameExistingSessionModal
        activeGame={{
          team_name: "Warriors",
          opponent_name: "Lakers",
          started_at: "2025-01-12T10:00:00.000Z",
        }}
        fmtDate={() => "Jan 12, 2025"}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByText("Active Game Detected")).toBeInTheDocument()
    expect(screen.getByText(/Warriors/)).toBeInTheDocument()
    expect(screen.getByText(/Lakers/)).toBeInTheDocument()
    expect(screen.getByText(/Jan 12, 2025/)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "End & Start New" }))
    expect(onConfirm).toHaveBeenCalled()
  })
})
