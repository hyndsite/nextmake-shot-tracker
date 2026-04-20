import { useState } from "react"

export function useGoalSetExpansion() {
  const [expandedSetIds, setExpandedSetIds] = useState(new Set())
  const [openCreateSet, setOpenCreateSet] = useState(false)
  const [openAddGoal, setOpenAddGoal] = useState(false)
  const [openArchived, setOpenArchived] = useState(false)

  function toggleExpanded(setId) {
    setExpandedSetIds((prev) => {
      const next = new Set(prev)
      if (next.has(setId)) next.delete(setId)
      else next.add(setId)
      return next
    })
  }

  return {
    expandedSetIds,
    openCreateSet,
    openAddGoal,
    openArchived,
    setExpandedSetIds,
    setOpenCreateSet,
    setOpenAddGoal,
    setOpenArchived,
    toggleExpanded,
  }
}
