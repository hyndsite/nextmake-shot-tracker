import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import HeatmapFilters from "../Heatmap/HeatmapFilters"

describe("HeatmapFilters", () => {
  it("renders source and filter controls and forwards changes", async () => {
    const user = userEvent.setup()
    const setSource = vi.fn()
    const setRangeId = vi.fn()
    const setMode = vi.fn()
    const setShotType = vi.fn()
    const setContested = vi.fn()

    render(
      <HeatmapFilters
        source="game"
        setSource={setSource}
        rangeId="180d"
        setRangeId={setRangeId}
        mode="attempts"
        setMode={setMode}
        shotType="Catch & Shoot"
        setShotType={setShotType}
        contested="all"
        setContested={setContested}
      />,
    )

    expect(screen.getByText("Source")).toBeInTheDocument()
    expect(screen.getByText("Game")).toBeInTheDocument()
    expect(screen.getByText("Attempt Density")).toBeInTheDocument()
    expect(screen.getByText("Free Throws")).toBeInTheDocument()
    expect(screen.getByText("Contested")).toBeInTheDocument()

    await user.click(screen.getByText("Practice"))
    expect(setSource).toHaveBeenCalledWith("practice")

    await user.click(screen.getByText("All"))
    expect(setRangeId).toHaveBeenCalledWith("all")

    await user.click(screen.getByText("FG%"))
    expect(setMode).toHaveBeenCalledWith("fgpct")

    await user.click(screen.getByText("Off-Dribble"))
    expect(setShotType).toHaveBeenCalledWith("Off-Dribble")

    await user.click(screen.getByText("Contested"))
    expect(setContested).toHaveBeenCalledWith("contested")
  })
})
