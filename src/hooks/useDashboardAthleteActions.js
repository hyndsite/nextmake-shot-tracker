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

  const handleArchiveAthlete = async () => {
    if (!activeAthlete?.id) return
    const ok = window.confirm(`Archive ${fullName(activeAthlete)}?`)
    if (!ok) return
    setError("")

    try {
      await archiveAthleteProfile(activeAthlete.id)
      archiveAthlete(activeAthlete.id)
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
    handleSelectAthlete,
    handleAddAthlete,
    handleArchiveAthlete,
  }
}
