import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import PerformanceMetricCard from "../Performance/PerformanceMetricCard"

describe("PerformanceMetricCard", () => {
  it("renders attempts mode as raw count and volume percentage", () => {
    render(
      <PerformanceMetricCard
        label="At Rim"
        fgPct={61}
        attempts={12}
        makes={7}
        attemptsLabel="7/12"
        goalPct={65}
        mode="attempts"
        totalAttempts={24}
      />,
    )

    expect(screen.getByText("At Rim")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
    expect(screen.getByText("50% of total volume")).toBeInTheDocument()
  })

  it("renders FG% mode with goal text", () => {
    render(
      <PerformanceMetricCard
        label="Above the Break 3"
        fgPct={37.6}
        attempts={8}
        makes={3}
        attemptsLabel="3/8"
        goalPct={40}
        mode="fgpct"
        totalAttempts={24}
      />,
    )

    expect(screen.getByText("38")).toBeInTheDocument()
    expect(screen.getByText("%")).toBeInTheDocument()
    expect(screen.getByText("3/8")).toBeInTheDocument()
    expect(screen.getByText("Goal: 40%")).toBeInTheDocument()
  })
})
