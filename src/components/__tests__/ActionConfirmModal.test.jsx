import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import ActionConfirmModal from "../ActionConfirmModal"

describe("ActionConfirmModal", () => {
  it("renders shared confirm modal content and forwards actions", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onConfirm = vi.fn()

    render(
      <ActionConfirmModal
        title="Confirm Action"
        body={<span>Body copy</span>}
        cancelLabel="Cancel"
        confirmLabel="Continue"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByText("Confirm Action")).toBeInTheDocument()
    expect(screen.getByText("Body copy")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Continue" }))
    expect(onConfirm).toHaveBeenCalled()
  })
})
