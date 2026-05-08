import { useState } from "react"

import {
  archiveGoalSet,
  createGoal,
  createGoalSet,
  deleteGoal,
  deleteGoalsBySet,
  deleteGoalSet,
  updateGoalSet,
} from "../lib/goals-db"
import { getActiveAthleteId, setActiveAthlete } from "../lib/athlete-db"
import {
  metricLabel,
  zoneLabel,
  ZONE_METRICS,
} from "../lib/goal-metrics"
import { useGoalForm } from "./goals-manager/useGoalForm"
import { useGoalsManagerDerivedState } from "./goals-manager/useGoalsManagerDerivedState"
import { useGoalsManagerQuery } from "./goals-manager/useGoalsManagerQuery"
import { useGoalSetExpansion } from "./goals-manager/useGoalSetExpansion"
import { useGoalSetForm } from "./goals-manager/useGoalSetForm"

export function useGoalsManagerData() {
  const [activeAthleteId, setActiveAthleteId] = useState(() => getActiveAthleteId() || "")
  const [selectedSetIdForGoal, setSelectedSetIdForGoal] = useState("")
  const [pendingConfirm, setPendingConfirm] = useState(null)
  const { loading, goalSets, athletes, gameEvents, practiceEntries, setGoalSets } =
    useGoalsManagerQuery({ activeAthleteId, setSelectedSetIdForGoal })
  const { activeSorted, archivedSorted, selectedSetForGoal, availableMetricOptions } =
    useGoalsManagerDerivedState({ goalSets, selectedSetIdForGoal })
  const goalForm = useGoalForm({ selectedSetForGoal, availableMetricOptions })
  const {
    setName,
    setSetName,
    setType,
    setSetType,
    setStartDate,
    setSetStartDate,
    setDueDate,
    setSetDueDate,
    editingSetId,
    resetSetForm,
    startEditSet: hydrateEditSetForm,
  } = useGoalSetForm()
  const {
    expandedSetIds,
    openCreateSet,
    openAddGoal,
    openArchived,
    setExpandedSetIds,
    setOpenCreateSet,
    setOpenAddGoal,
    setOpenArchived,
    toggleExpanded,
  } = useGoalSetExpansion()

  const {
    goalName: currentGoalName,
    setGoalName: setCurrentGoalName,
    goalDetails: currentGoalDetails,
    setGoalDetails: setCurrentGoalDetails,
    goalMetric: currentGoalMetric,
    setGoalMetric: setCurrentGoalMetric,
    goalTarget: currentGoalTarget,
    setGoalTarget: setCurrentGoalTarget,
    goalEndDate: currentGoalEndDate,
    setGoalEndDate: setCurrentGoalEndDate,
    goalTargetType: currentGoalTargetType,
    setGoalTargetType: setCurrentGoalTargetType,
    goalZoneId: currentGoalZoneId,
    setGoalZoneId: setCurrentGoalZoneId,
    addGoalDisabled: goalFormDisabled,
    resetGoalForm: resetCurrentGoalForm,
  } = goalForm

  async function handleCreateOrUpdateSet(event) {
    event.preventDefault()
    if (!setName || !setStartDate || !setDueDate) return

    try {
      if (editingSetId) {
        const updated = await updateGoalSet(editingSetId, {
          name: setName,
          type: setType,
          start_date: setStartDate,
          due_date: setDueDate,
        })
        setGoalSets((prev) =>
          prev.map((set) => (set.id === updated.id ? { ...set, ...updated } : set)),
        )
      } else {
        const created = await createGoalSet({
          name: setName,
          type: setType,
          startDate: setStartDate,
          dueDate: setDueDate,
        })
        setGoalSets((prev) => [...prev, { ...created, goals: [] }])
        if (!selectedSetIdForGoal && !created.archived) {
          setSelectedSetIdForGoal(created.id)
        }
      }
      resetSetForm()
    } catch (err) {
      console.warn("[GoalsManager] handleCreateOrUpdateSet error:", err)
      alert("Could not save goal set.")
    }
  }

  function startEditSet(set) {
    hydrateEditSetForm(set, setOpenCreateSet)
  }

  async function performDeleteSet(set) {
    try {
      await deleteGoalsBySet(set.id)
      await deleteGoalSet(set.id)
      setGoalSets((prev) => prev.filter((row) => row.id !== set.id))

      if (selectedSetIdForGoal === set.id) {
        const remaining = activeSorted.filter((row) => row.id !== set.id)
        setSelectedSetIdForGoal(remaining[0]?.id || "")
      }
    } catch (err) {
      console.warn("[GoalsManager] handleDeleteSet error:", err)
      alert("Could not delete goal set.")
    }
  }

  async function performArchiveSet(set) {
    try {
      const updated = await archiveGoalSet(set.id)
      setGoalSets((prev) =>
        prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
      )

      if (selectedSetIdForGoal === set.id) {
        const remaining = activeSorted.filter((row) => row.id !== set.id)
        setSelectedSetIdForGoal(remaining[0]?.id || "")
      }
    } catch (err) {
      console.warn("[GoalsManager] handleArchiveSet error:", err)
      alert("Could not archive goal set.")
    }
  }

  async function handleAddGoal(event) {
    event.preventDefault()
    if (
      !activeAthleteId ||
      !selectedSetIdForGoal ||
      !currentGoalMetric ||
      !currentGoalTarget ||
      !currentGoalEndDate ||
      !currentGoalTargetType
    ) {
      return
    }

    const isZoneMetric = ZONE_METRICS.has(currentGoalMetric)
    if (isZoneMetric && !currentGoalZoneId) {
      alert("Please select a zone for this zone-based goal.")
      return
    }

    if (selectedSetForGoal?.due_date && currentGoalEndDate > selectedSetForGoal.due_date) {
      alert("Target end date cannot be after the goal set due date.")
      return
    }

    try {
      const created = await createGoal({
        setId: selectedSetIdForGoal,
        athleteId: activeAthleteId,
        name: currentGoalName || metricLabel(currentGoalMetric),
        details:
          currentGoalDetails ||
          (isZoneMetric && currentGoalZoneId ? zoneLabel(currentGoalZoneId) : ""),
        metric: currentGoalMetric,
        targetValue: Number(currentGoalTarget),
        targetEndDate: currentGoalEndDate,
        targetType: currentGoalTargetType,
        zoneId: isZoneMetric ? currentGoalZoneId || null : null,
      })

      setGoalSets((prev) =>
        prev.map((set) =>
          set.id === selectedSetIdForGoal
            ? { ...set, goals: [...(set.goals || []), created] }
            : set,
        ),
      )

      resetCurrentGoalForm()
      setExpandedSetIds((prev) => new Set(prev).add(selectedSetIdForGoal))
      setOpenAddGoal(true)
    } catch (err) {
      console.warn("[GoalsManager] handleAddGoal error:", err)
      alert("Could not add goal.")
    }
  }

  async function performDeleteGoal(goal) {
    try {
      await deleteGoal(goal.id)
      setGoalSets((prev) =>
        prev.map((set) => ({
          ...set,
          goals: (set.goals || []).filter((row) => row.id !== goal.id),
        })),
      )
    } catch (err) {
      console.warn("[GoalsManager] handleDeleteGoal error:", err)
      alert("Could not delete goal.")
    }
  }

  function handleDeleteSet(set) {
    setPendingConfirm({
      title: "Delete Goal Set",
      body: `Delete ${set.name} and all goals within it? This cannot be undone.`,
      confirmLabel: "Delete Goal Set",
      action: () => performDeleteSet(set),
    })
  }

  function handleArchiveSet(set) {
    setPendingConfirm({
      title: "Archive Goal Set",
      body: "Archive this Goal Set? It will move under 'Archived Goal Sets' and be hidden from the active list.",
      confirmLabel: "Archive Goal Set",
      action: () => performArchiveSet(set),
    })
  }

  function handleDeleteGoal(goal) {
    const parentSet = goalSets.find((set) =>
      (set.goals || []).some((row) => row.id === goal.id),
    )
    const setTitle = parentSet?.name || "Goal Set"
    const label = goal.name || metricLabel(goal.metric)
    setPendingConfirm({
      title: "Delete Goal",
      body: `Delete ${setTitle} - ${label}?`,
      confirmLabel: "Delete Goal",
      action: () => performDeleteGoal(goal),
    })
  }

  function dismissPendingConfirm() {
    setPendingConfirm(null)
  }

  async function confirmPendingAction() {
    if (!pendingConfirm?.action) return
    const action = pendingConfirm.action
    setPendingConfirm(null)
    await action()
  }

  function selectAthlete(athleteId) {
    setActiveAthlete(athleteId)
    setActiveAthleteId(athleteId)
  }

  const addGoalDisabled =
    !activeAthleteId ||
    !selectedSetIdForGoal ||
    goalFormDisabled

  return {
    athlete: {
      athletes,
      activeAthleteId,
    },
    setForm: {
      values: {
        setName,
        setType,
        setStartDate,
        setDueDate,
        editingSetId,
      },
      actions: {
        setSetName,
        setSetType,
        setSetStartDate,
        setSetDueDate,
      },
    },
    goalForm: {
      values: {
        selectedSetIdForGoal,
        goalName: currentGoalName,
        goalDetails: currentGoalDetails,
        goalMetric: currentGoalMetric,
        goalTarget: currentGoalTarget,
        goalEndDate: currentGoalEndDate,
        goalTargetType: currentGoalTargetType,
        goalZoneId: currentGoalZoneId,
      },
      derived: {
        selectedSetForGoal,
        availableMetricOptions,
        addGoalDisabled,
      },
      actions: {
        setSelectedSetIdForGoal,
        setGoalName: setCurrentGoalName,
        setGoalDetails: setCurrentGoalDetails,
        setGoalMetric: setCurrentGoalMetric,
        setGoalTarget: setCurrentGoalTarget,
        setGoalEndDate: setCurrentGoalEndDate,
        setGoalTargetType: setCurrentGoalTargetType,
        setGoalZoneId: setCurrentGoalZoneId,
      },
    },
    lists: {
      loading,
      goalSets,
      gameEvents,
      practiceEntries,
      activeSorted,
      archivedSorted,
    },
    ui: {
      expandedSetIds,
      openCreateSet,
      openAddGoal,
      openArchived,
    },
    modal: pendingConfirm
      ? {
          title: pendingConfirm.title,
          body: pendingConfirm.body,
          confirmLabel: pendingConfirm.confirmLabel,
        }
      : null,
    uiActions: {
      setOpenCreateSet,
      setOpenAddGoal,
      setOpenArchived,
      toggleExpanded,
    },
    athleteActions: {
      selectAthlete,
    },
    setActions: {
      handleCreateOrUpdateSet,
      startEditSet,
      handleDeleteSet,
      handleArchiveSet,
    },
    goalActions: {
      handleAddGoal,
      handleDeleteGoal,
    },
    modalActions: {
      dismissPendingConfirm,
      confirmPendingAction,
    },
  }
}
