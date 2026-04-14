import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import PerformanceSection from "../Performance/PerformanceSection"

describe("PerformanceSection", () => {
  it("renders an expanded performance section and forwards interactions", async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    const onModeChange = vi.fn()
    const onRangeChange = vi.fn()
    const onShotTypeChange = vi.fn()
    const onContestedChange = vi.fn()
    const onTrendModeChange = vi.fn()
    const onSelectPoint = vi.fn()

    render(
      <PerformanceSection
        title="Game"
        expanded
        onToggle={onToggle}
        modeValue="fgpct"
        onModeChange={onModeChange}
        totalAttemptsText="100 FG attempts"
        rangeValue="30d"
        onRangeChange={onRangeChange}
        shotTypeValue="all"
        onShotTypeChange={onShotTypeChange}
        contestedValue="all"
        onContestedChange={onContestedChange}
        loading={false}
        emptyText="No game shots logged in this range yet."
        metrics={[{ id: "left_corner_3", label: "L Corner 3" }]}
        trendTitle="Game eFG% vs FG% Trend"
        trendData={[{ label: "Jan 15", fgPct: 50, efgPct: 55, fga: 10 }]}
        trendMode="daily"
        onTrendModeChange={onTrendModeChange}
        trendTicks={["Jan 15"]}
        sourceLabel="Game"
        selectedPoint={null}
        onSelectPoint={onSelectPoint}
        vizMode="fgpct"
        totalAttempts={100}
      />,
    )

    expect(screen.getByText("Game")).toBeInTheDocument()
    expect(screen.getByText("100 FG attempts")).toBeInTheDocument()
    expect(screen.getByText("L Corner 3")).toBeInTheDocument()
    expect(screen.getByText("Game eFG% vs FG% Trend")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Game" }))
    expect(onToggle).toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Attempts" }))
    expect(onModeChange).toHaveBeenCalledWith("attempts")

    await user.click(screen.getByRole("button", { name: "60D" }))
    expect(onRangeChange).toHaveBeenCalledWith("60d")

    await user.click(screen.getByRole("button", { name: "Catch & Shoot" }))
    expect(onShotTypeChange).toHaveBeenCalledWith("catch_shoot")

    await user.click(screen.getByRole("button", { name: "Contested" }))
    expect(onContestedChange).toHaveBeenCalledWith("contested")

    await user.click(screen.getByRole("button", { name: /daily/i }))
    expect(onTrendModeChange).toHaveBeenCalledWith("weekly")
  })

  it("renders loading and empty states", () => {
    const { rerender } = render(
      <PerformanceSection
        title="Practice"
        expanded
        onToggle={vi.fn()}
        modeValue="fgpct"
        onModeChange={vi.fn()}
        totalAttemptsText="No attempts yet"
        rangeValue="30d"
        onRangeChange={vi.fn()}
        shotTypeValue="all"
        onShotTypeChange={vi.fn()}
        contestedValue="all"
        onContestedChange={vi.fn()}
        loading
        emptyText="No practice entries logged in this range yet."
        metrics={[]}
        trendTitle="Practice eFG% vs FG% Trend"
        trendData={[]}
        trendMode="daily"
        onTrendModeChange={vi.fn()}
        trendTicks={[]}
        sourceLabel="Practice"
        selectedPoint={null}
        onSelectPoint={vi.fn()}
        vizMode="fgpct"
        totalAttempts={0}
      />,
    )

    expect(screen.getByText("Loading practice performance…")).toBeInTheDocument()

    rerender(
      <PerformanceSection
        title="Practice"
        expanded
        onToggle={vi.fn()}
        modeValue="fgpct"
        onModeChange={vi.fn()}
        totalAttemptsText="No attempts yet"
        rangeValue="30d"
        onRangeChange={vi.fn()}
        shotTypeValue="all"
        onShotTypeChange={vi.fn()}
        contestedValue="all"
        onContestedChange={vi.fn()}
        loading={false}
        emptyText="No practice entries logged in this range yet."
        metrics={[]}
        trendTitle="Practice eFG% vs FG% Trend"
        trendData={[]}
        trendMode="daily"
        onTrendModeChange={vi.fn()}
        trendTicks={[]}
        sourceLabel="Practice"
        selectedPoint={null}
        onSelectPoint={vi.fn()}
        vizMode="fgpct"
        totalAttempts={0}
      />,
    )

    expect(screen.getByText("No practice entries logged in this range yet.")).toBeInTheDocument()
  })
})
