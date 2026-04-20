import { useState } from "react"

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

export function useGoalSetForm() {
  const [setName, setSetName] = useState("")
  const [setType, setSetType] = useState("practice")
  const [setStartDate, setSetStartDate] = useState(() => todayDate())
  const [setDueDate, setSetDueDate] = useState("")
  const [editingSetId, setEditingSetId] = useState(null)

  function resetSetForm() {
    setSetName("")
    setSetType("practice")
    setSetStartDate(todayDate())
    setSetDueDate("")
    setEditingSetId(null)
  }

  function startEditSet(set, setOpenCreateSet) {
    setEditingSetId(set.id)
    setSetName(set.name || "")
    setSetType(set.type || "practice")
    setSetStartDate(set.start_date || todayDate())
    setSetDueDate(set.due_date || "")
    setOpenCreateSet(true)
  }

  return {
    setName,
    setType,
    setStartDate,
    setDueDate,
    editingSetId,
    setSetName,
    setSetType,
    setSetStartDate,
    setSetDueDate,
    setEditingSetId,
    resetSetForm,
    startEditSet,
  }
}
