import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  PerformanceContestedPills,
  PerformanceModePills,
  PerformanceShotTypePills,
  PerformanceTimeRangePills,
} from "../Performance/PerformancePills"

describe("PerformancePills", () => {
  it("renders mode pills and changes mode", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<PerformanceModePills value="fgpct" onChange={onChange} />)

    await user.click(screen.getByRole("button", { name: "Attempts" }))

    expect(onChange).toHaveBeenCalledWith("attempts")
  })

  it("renders time range pills and changes range", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<PerformanceTimeRangePills value="30d" onChange={onChange} />)

    await user.click(screen.getByRole("button", { name: "60D" }))

    expect(onChange).toHaveBeenCalledWith("60d")
  })

  it("renders shot type pills and changes shot type", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<PerformanceShotTypePills value="all" onChange={onChange} />)

    await user.click(screen.getByRole("button", { name: "Catch & Shoot" }))

    expect(onChange).toHaveBeenCalledWith("catch_shoot")
  })

  it("toggles contested pills back to all when active is clicked", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <PerformanceContestedPills value="contested" onChange={onChange} />,
    )

    await user.click(screen.getByRole("button", { name: "Contested" }))

    expect(onChange).toHaveBeenCalledWith("all")
  })
})
