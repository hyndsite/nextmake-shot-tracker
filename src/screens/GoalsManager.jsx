// src/screens/GoalsManager.jsx
import React from "react"
import { ArrowLeft } from "lucide-react"
import ActiveAthleteSwitcher from "../components/ActiveAthleteSwitcher"
import ActionConfirmModal from "../components/ActionConfirmModal"
import AddGoalFormSection from "../components/goals/AddGoalFormSection"
import GoalSetCard from "../components/goals/GoalSetCard"
import GoalSetFormSection from "../components/goals/GoalSetFormSection"
import AccordionSection from "../components/ui/AccordionSection"
import { useGoalsManagerData } from "../hooks/useGoalsManagerData"
import { ZONE_METRICS } from "../lib/goal-metrics"
import { computeGoalProgress } from "../lib/goals-ui"

// ------------------- component -------------------

export default function GoalsManager({ navigate }) {
  const {
    athlete,
    setForm,
    goalForm,
    lists,
    ui,
    modal,
    uiActions,
    athleteActions,
    setActions,
    goalActions,
    modalActions,
  } = useGoalsManagerData()

  const handleGoalMetricChange = (nextMetric) => {
    goalForm.actions.setGoalMetric(nextMetric)
    if (!ZONE_METRICS.has(nextMetric)) {
      goalForm.actions.setGoalZoneId("")
    }
  }

  const getGoalProgress = (goal, set) =>
    computeGoalProgress({
      goal,
      set,
      gameEvents: lists.gameEvents,
      practiceEntries: lists.practiceEntries,
    })

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-screen-sm mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate?.("home")}
            className="btn-back flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h2 className="text-sm font-semibold text-slate-900">
            Goal Management
          </h2>
          <div className="w-8 h-8 rounded-full bg-slate-200" />
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto p-4 pb-24 space-y-4">
        <ActiveAthleteSwitcher
          athletes={athlete.athletes}
          activeAthleteId={athlete.activeAthleteId}
          onSelectAthlete={athleteActions.selectAthlete}
        />

        <GoalSetFormSection
          open={ui.openCreateSet}
          editingSetId={setForm.values.editingSetId}
          setName={setForm.values.setName}
          setType={setForm.values.setType}
          setStartDate={setForm.values.setStartDate}
          setDueDate={setForm.values.setDueDate}
          onToggle={() => uiActions.setOpenCreateSet((value) => !value)}
          onSubmit={setActions.handleCreateOrUpdateSet}
          onSetNameChange={setForm.actions.setSetName}
          onSetTypeChange={setForm.actions.setSetType}
          onSetStartDateChange={setForm.actions.setSetStartDate}
          onSetDueDateChange={setForm.actions.setSetDueDate}
        />

        <AddGoalFormSection
          open={ui.openAddGoal}
          activeSorted={lists.activeSorted}
          selectedSetIdForGoal={goalForm.values.selectedSetIdForGoal}
          goalName={goalForm.values.goalName}
          goalDetails={goalForm.values.goalDetails}
          goalMetric={goalForm.values.goalMetric}
          goalZoneId={goalForm.values.goalZoneId}
          goalEndDate={goalForm.values.goalEndDate}
          goalTarget={goalForm.values.goalTarget}
          goalTargetType={goalForm.values.goalTargetType}
          selectedSetForGoal={goalForm.derived.selectedSetForGoal}
          availableMetricOptions={goalForm.derived.availableMetricOptions}
          addGoalDisabled={goalForm.derived.addGoalDisabled}
          onToggle={() => uiActions.setOpenAddGoal((value) => !value)}
          onSubmit={goalActions.handleAddGoal}
          onSelectedSetChange={goalForm.actions.setSelectedSetIdForGoal}
          onGoalNameChange={goalForm.actions.setGoalName}
          onGoalDetailsChange={goalForm.actions.setGoalDetails}
          onGoalMetricChange={handleGoalMetricChange}
          onGoalZoneIdChange={goalForm.actions.setGoalZoneId}
          onGoalEndDateChange={goalForm.actions.setGoalEndDate}
          onGoalTargetChange={goalForm.actions.setGoalTarget}
          onGoalTargetTypeChange={goalForm.actions.setGoalTargetType}
        />

        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-slate-800">
            Active Goal Sets
          </h2>

          {lists.loading && (
            <div className="text-sm text-slate-500">Loading goals…</div>
          )}

          {!lists.loading && lists.activeSorted.length === 0 && (
            <div className="text-sm text-slate-500">
              No active goal sets. Create one above to get started.
            </div>
          )}

          {lists.activeSorted.map((set) => {
            return (
              <GoalSetCard
                key={set.id}
                set={set}
                isArchived={false}
                isExpanded={ui.expandedSetIds.has(set.id)}
                onToggleExpanded={uiActions.toggleExpanded}
                onStartEdit={setActions.startEditSet}
                onDeleteSet={setActions.handleDeleteSet}
                onArchiveSet={setActions.handleArchiveSet}
                onDeleteGoal={goalActions.handleDeleteGoal}
                getGoalProgress={getGoalProgress}
              />
            )
          })}
        </section>

        <AccordionSection
          title="Archived Goal Sets"
          open={ui.openArchived}
          onToggle={() => uiActions.setOpenArchived((v) => !v)}
          contentClassName="border-t border-slate-100 p-4 space-y-2"
        >
          {!lists.loading && lists.archivedSorted.length === 0 && (
            <div className="text-sm text-slate-500">
              No archived goal sets.
            </div>
          )}

          {lists.archivedSorted.map((set) => {
            return (
              <GoalSetCard
                key={set.id}
                set={set}
                isArchived
                isExpanded={ui.expandedSetIds.has(set.id)}
                onToggleExpanded={uiActions.toggleExpanded}
                onStartEdit={setActions.startEditSet}
                onDeleteSet={setActions.handleDeleteSet}
                onArchiveSet={setActions.handleArchiveSet}
                onDeleteGoal={goalActions.handleDeleteGoal}
                getGoalProgress={getGoalProgress}
              />
            )
          })}
        </AccordionSection>
      </main>

      {modal && (
        <ActionConfirmModal
          title={modal.title}
          body={modal.body}
          cancelLabel="Cancel"
          confirmLabel={modal.confirmLabel}
          onCancel={modalActions.dismissPendingConfirm}
          onConfirm={modalActions.confirmPendingAction}
          widthClass="w-[90%] max-w-sm"
        />
      )}
    </div>
  )
}
