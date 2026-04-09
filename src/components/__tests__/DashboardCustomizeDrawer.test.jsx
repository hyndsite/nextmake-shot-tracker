import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import DashboardCustomizeDrawer from "../DashboardCustomizeDrawer"

const metricGroups = [
  {
    category: "Scoring",
    subcategory: "Overall",
    options: [
      { key: "efg_overall", label: "eFG% (overall)" },
      { key: "fg_overall", label: "FG% (overall)" },
    ],
  },
]

const rangeOptions = ["7d", "30d"]

describe("DashboardCustomizeDrawer", () => {
  it("renders draft metric controls and forwards interactions", async () => {
    const user = userEvent.setup()
    const closeCustomizeDrawer = vi.fn()
    const addDraftMetric = vi.fn()
    const removeDraftMetric = vi.fn()
    const updateDraftMetric = vi.fn()

    render(
      <DashboardCustomizeDrawer
        activeAthleteName="Zoe Smith"
        draftMetrics={[
          {
            metricKey: "efg_overall",
            rangeKey: "7d",
            sourceMode: "both",
            position: 0,
            enabled: true,
          },
        ]}
        draftError="Unable to save"
        savingDashboardMetrics={false}
        metricGroups={metricGroups}
        rangeOptions={rangeOptions}
        sourceFlags={() => ({ game: true, practice: true })}
        toSourceMode={(game, practice) => {
          if (game && practice) return "both"
          if (game) return "game"
          if (practice) return "practice"
          return ""
        }}
        closeCustomizeDrawer={closeCustomizeDrawer}
        addDraftMetric={addDraftMetric}
        removeDraftMetric={removeDraftMetric}
        updateDraftMetric={updateDraftMetric}
      />,
    )

    expect(screen.getByRole("heading", { name: "Customize Dashboard" })).toBeInTheDocument()
    expect(screen.getByText("Zoe Smith")).toBeInTheDocument()
    expect(screen.getByText("Unable to save")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Add metric" }))
    expect(addDraftMetric).toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Remove" }))
    expect(removeDraftMetric).toHaveBeenCalledWith(0)

    await user.selectOptions(screen.getByLabelText("Metric"), "fg_overall")
    expect(updateDraftMetric).toHaveBeenCalledWith(0, { metricKey: "fg_overall" })

    await user.click(screen.getByRole("button", { name: "30d" }))
    expect(updateDraftMetric).toHaveBeenCalledWith(0, { rangeKey: "30d" })

    await user.click(screen.getByLabelText("Game"))
    expect(updateDraftMetric).toHaveBeenCalledWith(0, { sourceMode: "practice" })

    await user.click(screen.getAllByRole("button", { name: "Close" })[0])
    expect(closeCustomizeDrawer).toHaveBeenCalled()
  })
})
