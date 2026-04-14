import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import PerformanceSectionHeader from "../Performance/PerformanceSectionHeader"

describe("PerformanceSectionHeader", () => {
  it("renders the title and toggles", async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    render(
      <PerformanceSectionHeader
        title="Game"
        expanded
        onToggle={onToggle}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Game" }))

    expect(onToggle).toHaveBeenCalled()
  })
})
