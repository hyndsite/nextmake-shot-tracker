import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import PracticeSessionHistory from "../PracticeSessionHistory"

vi.mock("lucide-react", () => ({
  ChevronDown: () => <span>v</span>,
  Trash2: () => <span>x</span>,
}))

describe("PracticeSessionHistory", () => {
  it("renders empty state when there are no previous sessions", () => {
    render(
      <PracticeSessionHistory
        groupedMonths={[]}
        openMonth={null}
        setOpenMonth={vi.fn()}
        openSession={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText("Previous Sessions")).toBeInTheDocument()
    expect(screen.getByText("No previous sessions yet.")).toBeInTheDocument()
  })

  it("toggles a month accordion and forwards open/delete actions", async () => {
    const user = userEvent.setup()
    const setOpenMonth = vi.fn()
    const openSession = vi.fn()
    const onDelete = vi.fn()

    render(
      <PracticeSessionHistory
        groupedMonths={[
          {
            key: "2026-01",
            label: "January 2026",
            sessions: [
              { id: "jan-1", started_at: "2026-01-10T10:00:00Z" },
            ],
          },
        ]}
        openMonth="2026-01"
        setOpenMonth={setOpenMonth}
        openSession={openSession}
        onDelete={onDelete}
      />,
    )

    const monthButton = screen.getByRole("button", { name: /january 2026/i })
    const monthContainer = monthButton.closest("div")
    expect(monthContainer.className).toContain("rounded-2xl")
    expect(monthButton.className).toContain("accordion-header")

    await user.click(monthButton)
    expect(setOpenMonth).toHaveBeenCalledWith(null)

    const sessionRow = screen.getByRole("button", { name: "Open session" })
    const expectedDay = new Date("2026-01-10T10:00:00Z").toLocaleDateString(undefined, {
      weekday: "long",
    })
    const expectedDate = new Date("2026-01-10T10:00:00Z").toLocaleDateString()
    expect(sessionRow).toHaveTextContent(`${expectedDay} | ${expectedDate}`)

    await user.click(sessionRow)
    expect(openSession).toHaveBeenCalledWith("jan-1")

    const row = screen.getByLabelText("Open session").closest(".practice-session-row")
    const deleteButton = within(row).getByLabelText("Delete session")
    await user.click(deleteButton)
    expect(onDelete).toHaveBeenCalledWith("jan-1")
  })
})
