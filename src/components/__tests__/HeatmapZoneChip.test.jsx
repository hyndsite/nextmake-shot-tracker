import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

import HeatmapZoneChip from "../Heatmap/HeatmapZoneChip"

describe("HeatmapZoneChip", () => {
  it("renders FG% chip content and forwards clicks", () => {
    const onClick = vi.fn()

    render(
      <HeatmapZoneChip
        zone={{
          id: "left_corner_3",
          label: "L Corner 3",
          attempts: 2,
          makes: 1,
          volumePct: 100,
          fgPct: 50,
        }}
        mode="fgpct"
        anchor={{ leftPct: 12, topPct: 80 }}
        onClick={onClick}
      />,
    )

    expect(screen.getByText("L Corner 3")).toBeInTheDocument()
    expect(screen.getByText("2 = 50%")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /L Corner 3/i }))
    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "left_corner_3" }),
    )
  })

  it("returns null when there is no anchor", () => {
    const { container } = render(
      <HeatmapZoneChip
        zone={{
          id: "left_corner_3",
          label: "L Corner 3",
          attempts: 2,
          makes: 1,
          volumePct: 100,
          fgPct: 50,
        }}
        mode="attempts"
        anchor={null}
        onClick={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
