import { useRef, useState } from "react"

import { replaceAthleteDashboardMetrics } from "../lib/athlete-dashboard-db"

const MAX_METRICS = 5

export function normalizeSourceMode(mode) {
  return mode === "game" || mode === "practice" || mode === "both" ? mode : "both"
}

function sourceFlags(mode) {
  const normalized = normalizeSourceMode(mode)
  return {
    game: normalized === "game" || normalized === "both",
    practice: normalized === "practice" || normalized === "both",
  }
}

function toSourceMode(game, practice) {
  if (game && practice) return "both"
  if (game) return "game"
  if (practice) return "practice"
  return ""
}

function buildEmptyMetricRow(position = 0) {
  return {
    metricKey: "",
    rangeKey: "7d",
    sourceMode: "both",
    position,
    enabled: true,
  }
}

function toDraftMetricRow(row, index) {
  return {
    metricKey: row.metric_key || "",
    rangeKey: row.range_key || "7d",
    sourceMode: normalizeSourceMode(row.source_mode || "both"),
    position: Number.isInteger(row.position) ? row.position : index,
    enabled: row.enabled !== false,
  }
}

export function useDashboardCustomization({
  activeAthleteId,
  dashboardMetrics,
  setDashboardMetrics,
}) {
  const [dashboardActionError, setDashboardActionError] = useState("")
  const [showCustomize, setShowCustomize] = useState(false)
  const [draftMetrics, setDraftMetrics] = useState([])
  const [draftError, setDraftError] = useState("")
  const [savingDashboardMetrics, setSavingDashboardMetrics] = useState(false)
  const [removingMetricPosition, setRemovingMetricPosition] = useState(null)
  const draftMetricsRef = useRef([])
  const dashboardSaveRequestRef = useRef(0)

  const openCustomizeDrawer = () => {
    setDashboardActionError("")
    const nextRows = [...(dashboardMetrics || [])]
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      .slice(0, MAX_METRICS)
      .map((row, index) => toDraftMetricRow(row, index))
    draftMetricsRef.current = nextRows
    setDraftMetrics(nextRows)
    setDraftError("")
    setShowCustomize(true)
  }

  const closeCustomizeDrawer = () => {
    setShowCustomize(false)
    setDraftError("")
  }

  const toCleanedDraftRows = (rows) => rows
    .map((row, index) => ({
      metricKey: String(row.metricKey || "").trim(),
      rangeKey: row.rangeKey || "7d",
      sourceMode: normalizeSourceMode(row.sourceMode || "both"),
      position: index,
      enabled: row.enabled !== false,
    }))
    .filter((row) => row.metricKey)

  const persistDraftMetrics = async (rows) => {
    if (!activeAthleteId) {
      setDraftError("Select an active athlete before saving.")
      return
    }

    const cleaned = toCleanedDraftRows(rows)
    if (cleaned.length > MAX_METRICS) {
      setDraftError("You can select at most 5 metrics.")
      return
    }
    for (const row of cleaned) {
      const flags = sourceFlags(row.sourceMode)
      if (!flags.game && !flags.practice) {
        setDraftError("Each metric must include Game, Practice, or both.")
        return
      }
    }

    const requestId = dashboardSaveRequestRef.current + 1
    dashboardSaveRequestRef.current = requestId
    setSavingDashboardMetrics(true)
    setDraftError("")
    try {
      const rowsSaved = await replaceAthleteDashboardMetrics(activeAthleteId, cleaned)
      if (dashboardSaveRequestRef.current !== requestId) return
      setDashboardMetrics(rowsSaved || [])
    } catch (err) {
      if (dashboardSaveRequestRef.current !== requestId) return
      setDraftError(err?.message || "Unable to save dashboard settings")
    } finally {
      if (dashboardSaveRequestRef.current === requestId) {
        setSavingDashboardMetrics(false)
      }
    }
  }

  const updateDraftMetric = (index, patch) => {
    const prev = draftMetricsRef.current
    const next = prev.map((row, i) => (
      i === index ? { ...row, ...patch, position: i } : { ...row, position: i }
    ))
    draftMetricsRef.current = next
    setDraftMetrics(next)
    void persistDraftMetrics(next)
  }

  const addDraftMetric = () => {
    const prev = draftMetricsRef.current
    if (prev.length >= MAX_METRICS) return
    const next = [...prev, buildEmptyMetricRow(prev.length)]
    draftMetricsRef.current = next
    setDraftMetrics(next)
    void persistDraftMetrics(next)
  }

  const removeDraftMetric = (index) => {
    const prev = draftMetricsRef.current
    const next = prev
      .filter((_, i) => i !== index)
      .map((row, i) => ({ ...row, position: i }))
    draftMetricsRef.current = next
    setDraftMetrics(next)
    void persistDraftMetrics(next)
  }

  const removeConfiguredMetric = async (position) => {
    if (!activeAthleteId) return

    const remainingRows = [...(dashboardMetrics || [])]
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      .filter((row) => Number(row.position) !== Number(position))
      .slice(0, MAX_METRICS)
      .map((row, index) => ({
        metricKey: row.metric_key || "",
        rangeKey: row.range_key || "7d",
        sourceMode: normalizeSourceMode(row.source_mode || "both"),
        position: index,
        enabled: row.enabled !== false,
      }))
      .filter((row) => row.metricKey)

    setRemovingMetricPosition(position)
    setDashboardActionError("")
    try {
      const rows = await replaceAthleteDashboardMetrics(activeAthleteId, remainingRows)
      setDashboardMetrics(rows || [])
    } catch (err) {
      setDashboardActionError(err?.message || "Unable to remove dashboard metric")
    } finally {
      setRemovingMetricPosition(null)
    }
  }

  return {
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
  }
}
