import ActionConfirmModal from "../components/ActionConfirmModal"
import DashboardAthletePanel from "../components/DashboardAthletePanel"
import DashboardCustomizeDrawer from "../components/DashboardCustomizeDrawer"
import DashboardMetricsSection from "../components/DashboardMetricsSection"
import DashboardSnapshotSection from "../components/DashboardSnapshotSection"
import { DASHBOARD_METRIC_GROUPS } from "../constants/dashboard-metrics"
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
    pendingArchiveAthlete,
    handleSelectAthlete,
    handleAddAthlete,
    handleArchiveAthlete,
    dismissArchiveAthlete,
    confirmArchiveAthlete,
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
        <DashboardCustomizeDrawer
          activeAthleteName={fullName(activeAthlete)}
          draftMetrics={draftMetrics}
          draftError={draftError}
          savingDashboardMetrics={savingDashboardMetrics}
          metricGroups={DASHBOARD_METRIC_GROUPS}
          rangeOptions={RANGE_OPTIONS}
          sourceFlags={sourceFlags}
          toSourceMode={toSourceMode}
          closeCustomizeDrawer={closeCustomizeDrawer}
          addDraftMetric={addDraftMetric}
          removeDraftMetric={removeDraftMetric}
          updateDraftMetric={updateDraftMetric}
        />
      )}

      {pendingArchiveAthlete && (
        <ActionConfirmModal
          title="Archive Athlete"
          body={`Archive ${fullName(pendingArchiveAthlete)}?`}
          cancelLabel="Cancel"
          confirmLabel="Archive Athlete"
          onCancel={dismissArchiveAthlete}
          onConfirm={confirmArchiveAthlete}
          widthClass="w-[90%] max-w-sm"
        />
      )}
    </div>
  )
}
