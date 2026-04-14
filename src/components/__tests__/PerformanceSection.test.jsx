import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import PerformanceSection from "../PerformanceSection"

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

    const ModePills = ({ value, onChange }) => (
      <button type="button" onClick={() => onChange("attempts")}>{value}</button>
    )
    const TimeRangePills = ({ value, onChange }) => (
      <button type="button" onClick={() => onChange("60d")}>{value}</button>
    )
    const ShotTypePills = ({ value, onChange }) => (
      <button type="button" onClick={() => onChange("catch_shoot")}>{value}</button>
    )
    const ContestedPills = ({ value, onChange }) => (
      <button type="button" onClick={() => onChange("contested")}>{value}</button>
    )
    const MetricCard = ({ label }) => <div>{label}</div>
    const TrendChart = ({ title, onModeChange, onSelectPoint }) => (
      <button
        type="button"
        onClick={() => {
          onModeChange("weekly")
          onSelectPoint({ label: "Jan 15" })
        }}
      >
        {title}
      </button>
    )
    const SectionHeader = ({ title, onToggle }) => (
      <button type="button" onClick={onToggle}>{title}</button>
    )

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
        ModePills={ModePills}
        TimeRangePills={TimeRangePills}
        ShotTypePills={ShotTypePills}
        ContestedPills={ContestedPills}
        MetricCard={MetricCard}
        TrendChart={TrendChart}
        SectionHeader={SectionHeader}
      />,
    )

    expect(screen.getByText("Game")).toBeInTheDocument()
    expect(screen.getByText("100 FG attempts")).toBeInTheDocument()
    expect(screen.getByText("L Corner 3")).toBeInTheDocument()
    expect(screen.getByText("Game eFG% vs FG% Trend")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Game" }))
    expect(onToggle).toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "fgpct" }))
    expect(onModeChange).toHaveBeenCalledWith("attempts")

    await user.click(screen.getByRole("button", { name: "30d" }))
    expect(onRangeChange).toHaveBeenCalledWith("60d")

    const allButtons = screen.getAllByRole("button", { name: "all" })
    await user.click(allButtons[0])
    expect(onShotTypeChange).toHaveBeenCalledWith("catch_shoot")

    await user.click(allButtons[1])
    expect(onContestedChange).toHaveBeenCalledWith("contested")

    await user.click(screen.getByRole("button", { name: "Game eFG% vs FG% Trend" }))
    expect(onTrendModeChange).toHaveBeenCalledWith("weekly")
    expect(onSelectPoint).toHaveBeenCalledWith({ label: "Jan 15" })
  })

  it("renders loading and empty states", () => {
    const SectionHeader = ({ title }) => <button type="button">{title}</button>

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
        ModePills={() => null}
        TimeRangePills={() => null}
        ShotTypePills={() => null}
        ContestedPills={() => null}
        MetricCard={() => null}
        TrendChart={() => null}
        SectionHeader={SectionHeader}
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
        ModePills={() => null}
        TimeRangePills={() => null}
        ShotTypePills={() => null}
        ContestedPills={() => null}
        MetricCard={() => null}
        TrendChart={() => null}
        SectionHeader={SectionHeader}
      />,
    )

    expect(screen.getByText("No practice entries logged in this range yet.")).toBeInTheDocument()
  })
})
