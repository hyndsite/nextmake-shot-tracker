import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import DashboardSnapshotSection from "../DashboardSnapshotSection"

describe("DashboardSnapshotSection", () => {
  it("renders snapshot values and loading state", () => {
    render(
      <DashboardSnapshotSection
        loading
        snapshot={{
          efgPct7d: 54.3,
          fgPct7d: 48.1,
          attemptsToday: 25,
          attempts7d: 120,
          streakDays: 4,
          makes7d: 58,
          practiceAttempts7d: 80,
          gameAttempts7d: 40,
          topZone: { zoneId: "left_corner_three", fgPct: 62.2 },
          weakestZone: { zoneId: "mid_range", fgPct: 33.3 },
          lastSession: {
            source: "game",
            zoneId: "paint",
            makes: 5,
            attempts: 8,
          },
          goalSummary: {
            progressPct: 72,
            setName: "April Push",
          },
        }}
      />,
    )

    expect(screen.getByText("Performance Snapshot")).toBeInTheDocument()
    expect(screen.getByText("Updating...")).toBeInTheDocument()
    expect(screen.getByText("54.3%")).toBeInTheDocument()
    expect(screen.getByText("48.1%")).toBeInTheDocument()
    expect(screen.getByText("25")).toBeInTheDocument()
    expect(screen.getByText("120")).toBeInTheDocument()
    expect(screen.getByText("4d")).toBeInTheDocument()
    expect(screen.getByText("58 / 120 (48.3%)")).toBeInTheDocument()
    expect(screen.getByText("P 80 • G 40")).toBeInTheDocument()
    expect(screen.getByText("Left Corner Three · 62.2%")).toBeInTheDocument()
    expect(screen.getByText("Mid Range · 33.3%")).toBeInTheDocument()
    expect(screen.getByText("Game · Paint · 5/8")).toBeInTheDocument()
    expect(screen.getByText("72% · April Push")).toBeInTheDocument()
  })
})
