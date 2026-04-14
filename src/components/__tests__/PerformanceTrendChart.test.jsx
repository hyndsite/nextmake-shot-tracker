import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import PerformanceTrendChart from "../Performance/PerformanceTrendChart"

describe("PerformanceTrendChart", () => {
  it("renders empty state when there is no data", () => {
    render(
      <PerformanceTrendChart
        title="Game Trend"
        data={[]}
        mode="daily"
        onModeChange={vi.fn()}
        ticks={[]}
        sourceLabel="Game"
        selectedPoint={null}
        onSelectPoint={vi.fn()}
        vizMode="fgpct"
      />,
    )

    expect(
      screen.getByText("Not enough shot data yet to show a trend."),
    ).toBeInTheDocument()
  })

  it("cycles mode and shows selected point text", async () => {
    const user = userEvent.setup()
    const onModeChange = vi.fn()
    render(
      <PerformanceTrendChart
        title="Game Trend"
        data={[{ label: "Jan 12", fgPct: 50, efgPct: 55, fga: 8 }]}
        mode="daily"
        onModeChange={onModeChange}
        ticks={["Jan 12"]}
        sourceLabel="Game"
        selectedPoint={{ label: "2026-01-12" }}
        onSelectPoint={vi.fn()}
        vizMode="fgpct"
      />,
    )

    await user.click(screen.getByRole("button", { name: /daily/i }))
    expect(onModeChange).toHaveBeenCalledWith("weekly")
    expect(screen.getByText(/Selected:/)).toBeInTheDocument()
  })
})
