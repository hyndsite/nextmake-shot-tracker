import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import BottomNav from "../BottomNav.jsx"

describe("BottomNav", () => {
  it("shows active tab with blue shades and no border styling on nav button", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<BottomNav activeTab="dashboard" onChange={onChange} />)

    const homeButton = screen.getByRole("button", { name: "Home" })
    const practiceButton = screen.getByRole("button", { name: "Practice" })

    expect(homeButton.className).toContain("border-0")
    expect(homeButton.className).toContain("bg-transparent")
    expect(homeButton.className).not.toContain("focus-visible:ring-2")

    const homeIcon = homeButton.querySelector("svg")
    const practiceIcon = practiceButton.querySelector("svg")
    const homeLabel = homeButton.querySelector("span")
    const practiceLabel = practiceButton.querySelector("span")

    expect(homeIcon.getAttribute("class")).toContain("text-sky-600")
    expect(practiceIcon.getAttribute("class")).toContain("text-slate-500")
    expect(homeLabel.className).toContain("text-sky-700")
    expect(practiceLabel.className).toContain("text-slate-500")

    await user.click(practiceButton)
    expect(onChange).toHaveBeenCalledWith("practice")
  })
})
