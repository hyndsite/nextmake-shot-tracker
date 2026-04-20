import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

import AccordionSection from "../AccordionSection"

vi.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="accordion-chevron">Chevron</span>,
}))

describe("AccordionSection", () => {
  it("renders the title and calls onToggle", () => {
    const onToggle = vi.fn()

    render(
      <AccordionSection title="Archived Goal Sets" open={false} onToggle={onToggle}>
        <div>Hidden content</div>
      </AccordionSection>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Archived Goal Sets" }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it("renders children only when open and rotates the chevron", () => {
    const { rerender } = render(
      <AccordionSection title="Add Goal to Set" open={false} onToggle={vi.fn()}>
        <div>Goal form</div>
      </AccordionSection>,
    )

    expect(screen.queryByText("Goal form")).not.toBeInTheDocument()

    rerender(
      <AccordionSection title="Add Goal to Set" open onToggle={vi.fn()}>
        <div>Goal form</div>
      </AccordionSection>,
    )

    expect(screen.getByText("Goal form")).toBeInTheDocument()
    expect(screen.getByTestId("accordion-chevron").parentElement.className).toContain(
      "rotate-180",
    )
  })

  it("applies custom content class names", () => {
    render(
      <AccordionSection
        title="Create New Goal Set"
        open
        onToggle={vi.fn()}
        contentClassName="custom-content"
      >
        <div>Set form</div>
      </AccordionSection>,
    )

    expect(screen.getByText("Set form").parentElement.className).toContain("custom-content")
  })
})
