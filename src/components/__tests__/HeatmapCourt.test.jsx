import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

import HeatmapCourt from "../Heatmap/HeatmapCourt"

describe("HeatmapCourt", () => {
  it("renders the court image and summary text", () => {
    render(
      <HeatmapCourt
        loading={false}
        totalAttempts={3}
        zones={[]}
        mode="attempts"
        anchorMap={new Map()}
        onImageLoad={vi.fn()}
        onZoneClick={vi.fn()}
      />,
    )

    expect(screen.getByText("Court View")).toBeInTheDocument()
    expect(screen.getByText("3 attempts")).toBeInTheDocument()
    expect(screen.getByAltText("Half court")).toBeInTheDocument()
  })

  it("renders zone chips and forwards image and zone events", () => {
    const onImageLoad = vi.fn()
    const onZoneClick = vi.fn()

    render(
      <HeatmapCourt
        loading={false}
        totalAttempts={2}
        zones={[
          {
            id: "left_corner_3",
            label: "L Corner 3",
            attempts: 2,
            makes: 1,
            volumePct: 100,
            fgPct: 50,
          },
        ]}
        mode="fgpct"
        anchorMap={
          new Map([
            ["left_corner_3", { id: "left_corner_3", leftPct: 12, topPct: 80 }],
          ])
        }
        onImageLoad={onImageLoad}
        onZoneClick={onZoneClick}
      />,
    )

    fireEvent.load(screen.getByAltText("Half court"))
    expect(onImageLoad).toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: /L Corner 3/i }))
    expect(onZoneClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "left_corner_3" }),
    )
    expect(screen.getByText("2 = 50%")).toBeInTheDocument()
  })
})
