import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import PracticeExistingSessionModal from "../PracticeExistingSessionModal"

describe("PracticeExistingSessionModal", () => {
  it("renders the active-session warning and forwards actions", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onResume = vi.fn()

    render(
      <PracticeExistingSessionModal
        onCancel={onCancel}
        onResume={onResume}
      />,
    )

    expect(screen.getByText("Active Session Found")).toBeInTheDocument()
    expect(
      screen.getByText(
        "This athlete already has an active session. Please resume that session instead of starting a new one.",
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Resume Existing Session" }))
    expect(onResume).toHaveBeenCalled()
  })
})
