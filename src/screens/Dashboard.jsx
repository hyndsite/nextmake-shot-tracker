import DashboardAthletePanel from "../components/DashboardAthletePanel"
import DashboardMetricsSection from "../components/DashboardMetricsSection"
import DashboardSnapshotSection from "../components/DashboardSnapshotSection"
import {
  DASHBOARD_METRIC_GROUPS,
} from "../constants/dashboard-metrics"
import {
  fullName,
} from "../lib/dashboard-formatters"
import { useDashboardData } from "../hooks/useDashboardData"
import { useDashboardAthleteActions } from "../hooks/useDashboardAthleteActions"
import {
  useDashboardCustomization,
} from "../hooks/useDashboardCustomization"
import { useDashboardMetricCards } from "../hooks/useDashboardMetricCards"

const RANGE_OPTIONS = ["7d", "30d", "90d", "180d", "1y"]

export default function Dashboard() {
  const {
    athletes,
    athletesError,
    activeAthleteId: activeId,
    activeAthlete,
    refreshAthletes,
    selectAthlete,
    snapshot,
    snapshotLoading,
    gameRows,
    practiceRows,
    dashboardMetrics,
    setDashboardMetrics,
    dashboardMetricsLoading,
    dashboardMetricsError,
  } = useDashboardData()
  const {
    showSwitch,
    setShowSwitch,
    showAdd,
    setShowAdd,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    error,
    handleSelectAthlete,
    handleAddAthlete,
    handleArchiveAthlete,
  } = useDashboardAthleteActions({
    activeAthlete,
    refreshAthletes,
    selectAthlete,
  })
  const {
    dashboardActionError,
    showCustomize,
    draftMetrics,
    draftError,
    savingDashboardMetrics,
    removingMetricPosition,
    openCustomizeDrawer,
    closeCustomizeDrawer,
    updateDraftMetric,
    addDraftMetric,
    removeDraftMetric,
    removeConfiguredMetric,
    sourceFlags,
    toSourceMode,
  } = useDashboardCustomization({
    activeAthleteId: activeId,
    dashboardMetrics,
    setDashboardMetrics,
  })
  const { configuredMetricCards, dashboardMetricsSubtitle } = useDashboardMetricCards({
    dashboardMetrics,
    gameRows,
    practiceRows,
  })

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-screen-sm mx-auto px-4 py-3">
          <h2 className="screen-title">Dashboard</h2>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto p-4 pb-24 space-y-4">
        <DashboardAthletePanel
          activeAthlete={activeAthlete}
          athletes={athletes}
          activeId={activeId}
          showSwitch={showSwitch}
          setShowSwitch={setShowSwitch}
          showAdd={showAdd}
          setShowAdd={setShowAdd}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          error={error}
          athletesError={athletesError}
          handleSelectAthlete={handleSelectAthlete}
          handleAddAthlete={handleAddAthlete}
          handleArchiveAthlete={handleArchiveAthlete}
        />

        <DashboardMetricsSection
          subtitle={dashboardMetricsSubtitle}
          loading={dashboardMetricsLoading}
          error={dashboardActionError || dashboardMetricsError}
          cards={configuredMetricCards}
          removingMetricPosition={removingMetricPosition}
          onAddMetric={openCustomizeDrawer}
          onRemoveMetric={removeConfiguredMetric}
        />

        <DashboardSnapshotSection snapshot={snapshot} loading={snapshotLoading} />
      </main>

      {showCustomize && (
        <div className="fixed inset-0 z-30">
          <button
            type="button"
            aria-label="Close customize dashboard"
            className="absolute inset-0 bg-slate-900/30"
            onClick={closeCustomizeDrawer}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-xl border-l border-slate-200 flex flex-col">
            <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Customize Dashboard</h3>
                <p className="text-xs text-slate-500">{fullName(activeAthlete)}</p>
              </div>
              <button
                type="button"
                className="h-8 rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-700"
                onClick={closeCustomizeDrawer}
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <button
                type="button"
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700"
                onClick={addDraftMetric}
                disabled={draftMetrics.length >= 5}
              >
                Add metric
              </button>

              {draftMetrics.map((row, index) => {
                const flags = sourceFlags(row.sourceMode)
                return (
                  <div key={`metric-row-${index}`} className="rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Metric {index + 1}
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-600"
                        onClick={() => removeDraftMetric(index)}
                      >
                        Remove
                      </button>
                    </div>

                    <label className="block text-xs font-medium text-slate-700" htmlFor={`metric-${index}`}>
                      Metric
                    </label>
                    <select
                      id={`metric-${index}`}
                      aria-label="Metric"
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
                      value={row.metricKey}
                      onChange={(e) => updateDraftMetric(index, { metricKey: e.target.value })}
                    >
                      <option value="">Select metric</option>
                      {DASHBOARD_METRIC_GROUPS.map((group) => (
                        <optgroup
                          key={`${group.category}-${group.subcategory}`}
                          label={`${group.category} / ${group.subcategory}`}
                        >
                          {group.options.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    <div className="space-y-1">
                      <div className="text-xs font-medium text-slate-700">Range</div>
                      <div className="flex flex-wrap gap-1.5">
                        {RANGE_OPTIONS.map((rangeKey) => (
                          <button
                            key={`${index}-${rangeKey}`}
                            type="button"
                            onClick={() => updateDraftMetric(index, { rangeKey })}
                            className={`h-8 rounded-full border px-2.5 text-xs font-semibold ${
                              row.rangeKey === rangeKey
                                ? "border-sky-600 bg-sky-50 text-sky-700"
                                : "border-slate-300 text-slate-700"
                            }`}
                          >
                            {rangeKey}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-medium text-slate-700">Source</div>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={flags.game}
                            onChange={(e) => {
                              const nextMode = toSourceMode(e.target.checked, flags.practice)
                              if (!nextMode) return
                              updateDraftMetric(index, { sourceMode: nextMode })
                            }}
                          />
                          Game
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={flags.practice}
                            onChange={(e) => {
                              const nextMode = toSourceMode(flags.game, e.target.checked)
                              if (!nextMode) return
                              updateDraftMetric(index, { sourceMode: nextMode })
                            }}
                          />
                          Practice
                        </label>
                      </div>
                    </div>
                  </div>
                )
              })}

              {draftError && (
                <div className="text-xs text-red-600">{draftError}</div>
              )}
            </div>

            <div className="border-t border-slate-200 p-4 flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500">
                {savingDashboardMetrics ? "Saving changes..." : "Changes save automatically"}
              </div>
              <button
                type="button"
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700"
                onClick={closeCustomizeDrawer}
              >
                Close
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
