import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import DashboardMetricsSection from "../DashboardMetricsSection"

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Line: () => null,
}))

describe("DashboardMetricsSection", () => {
  it("renders cards, errors, and add metric action", async () => {
    const user = userEvent.setup()
    const onAddMetric = vi.fn()
    const onRemoveMetric = vi.fn()

    render(
      <DashboardMetricsSection
        subtitle="Add up to 4 metrics"
        loading={false}
        error="Unable to load dashboard metrics"
        cards={[
          {
            id: "dm-1",
            label: "eFG% (overall)",
            rangeKey: "7d",
            sourceLabel: "Game vs Practice",
            format: "percent",
            sourceMode: "both",
            position: 0,
            series: { points: [] },
          },
        ]}
        removingMetricPosition={null}
        onAddMetric={onAddMetric}
        onRemoveMetric={onRemoveMetric}
      />,
    )

    expect(screen.getByText("Dashboard Metrics")).toBeInTheDocument()
    expect(screen.getByText("Add up to 4 metrics")).toBeInTheDocument()
    expect(screen.getByText("Unable to load dashboard metrics")).toBeInTheDocument()
    expect(screen.getByText("eFG% (overall)")).toBeInTheDocument()
    expect(screen.getByText(/Game vs Practice/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "+ Add Metric" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Remove eFG% (overall)" }))
    expect(onRemoveMetric).toHaveBeenCalledWith(0)

    await user.click(screen.getByRole("button", { name: "+ Add Metric" }))
    expect(onAddMetric).toHaveBeenCalled()
  })
})
