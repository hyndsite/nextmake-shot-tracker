import { useState } from "react"

import { addAthlete, archiveAthlete } from "../lib/athlete-db"
import {
  archiveAthleteProfile,
  createAthleteProfile,
} from "../lib/athlete-profiles-db"
import { fullName } from "../lib/dashboard-formatters"

export function useDashboardAthleteActions({
  activeAthlete,
  refreshAthletes,
  selectAthlete,
}) {
  const [showSwitch, setShowSwitch] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState("")
  const [pendingArchiveAthlete, setPendingArchiveAthlete] = useState(null)

  const handleSelectAthlete = (id) => {
    setError("")
    selectAthlete(id)
    setShowSwitch(false)
  }

  const handleAddAthlete = async (e) => {
    e.preventDefault()
    setError("")

    try {
      const remote = await createAthleteProfile({ firstName, lastName })
      const created = addAthlete({
        firstName: remote.first_name,
        lastName: remote.last_name || "",
        id: remote.id,
        createdAt: remote.created_at,
        avatarColor: remote.avatar_color || undefined,
      })
      setFirstName("")
      setLastName("")
      setShowAdd(false)
      selectAthlete(created.id)
    } catch (err) {
      setError(err?.message || "Unable to add athlete")
    }
  }

  const handleArchiveAthlete = () => {
    if (!activeAthlete?.id) return
    setPendingArchiveAthlete(activeAthlete)
  }

  const dismissArchiveAthlete = () => {
    setPendingArchiveAthlete(null)
  }

  const confirmArchiveAthlete = async () => {
    if (!pendingArchiveAthlete?.id) return
    setError("")

    try {
      await archiveAthleteProfile(pendingArchiveAthlete.id)
      archiveAthlete(pendingArchiveAthlete.id)
      setPendingArchiveAthlete(null)
      setShowSwitch(false)
      refreshAthletes()
    } catch (err) {
      setError(err?.message || "Unable to archive athlete")
    }
  }

  return {
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
  }
}
