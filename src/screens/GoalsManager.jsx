// src/screens/GoalsManager.jsx
import React, { useEffect, useMemo, useState } from "react"
import {
  createGoalSet,
  updateGoalSet,
  deleteGoalSet,
  deleteGoalsBySet,
  listGoalSetsWithGoals,
  createGoal,
  deleteGoal,
} from "../lib/goals-db"
import { supabase, getUser } from "../lib/supabase"
import {
  BASE_METRIC_OPTIONS,
  GAME_ONLY_METRIC_OPTIONS,
  computeGameMetricValue,
  computePracticeMetricValue,
  metricIsPercent,
  formatMetricValue,
} from "../lib/goal-metrics"
import { ZONES } from "../constants/zones" // adjust path if needed
import { ArrowLeft, Calendar, Edit2, Trash2, ChevronDown } from "lucide-react"
import { MdEmojiObjects } from "react-icons/md"

// ------------------- helpers -------------------

const ALL_METRIC_OPTIONS = [...BASE_METRIC_OPTIONS, ...GAME_ONLY_METRIC_OPTIONS]

function metricLabel(value) {
  return ALL_METRIC_OPTIONS.find((m) => m.value === value)?.label || value
}

function zoneLabel(zoneId) {
  if (!zoneId) return null
  return ZONES.find((z) => z.id === zoneId)?.label || zoneId
}

function formatDueDate(iso) {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function daysLeft(iso) {
  if (!iso) return null
  const today = new Date()
  const due = new Date(iso)
  const diffMs = due.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Compute the current metric value + progress against a goal.
 */
function computeGoalProgress({ goal, set, gameEvents, practiceEntries }) {
  const metricKey = goal.metric
  const targetRaw = Number(goal.target_value ?? 0)
  const targetType = goal.target_type || "percent"
  const isPercentMetric = metricIsPercent(metricKey)

  // Date window + zone
  const startDate = set?.start_date || undefined
  const endDate = goal.target_end_date || set?.due_date || undefined
  const zoneId = goal.zone_id || undefined
  const range = { startDate, endDate, zoneId }

  let currentRaw = 0
  if (set.type === "game") {
    currentRaw = computeGameMetricValue(metricKey, gameEvents, range)
  } else {
    currentRaw = computePracticeMetricValue(metricKey, practiceEntries, range)
  }

  const safeTarget = Number.isFinite(targetRaw) ? targetRaw : 0
  const safeCurrent = Number.isFinite(currentRaw) ? currentRaw : 0

  const progressPct =
    safeTarget > 0
      ? Math.min(100, Math.round((safeCurrent / safeTarget) * 100))
      : 0

  // Target label
  let targetLabel
  if (!safeTarget) {
    targetLabel = "—"
  } else if (isPercentMetric || targetType === "percent") {
    targetLabel = `${safeTarget}%`
  } else {
    targetLabel = String(safeTarget)
  }

  // Current label
  let currentLabel
  if (isPercentMetric) {
    currentLabel = formatMetricValue(metricKey, safeCurrent)
  } else if (targetType === "percent") {
    const v = Math.round(safeCurrent * 10) / 10
    currentLabel = `${v}%`
  } else {
    currentLabel = String(Math.round(safeCurrent))
  }

  return {
    targetRaw: safeTarget,
    currentRaw: safeCurrent,
    progressPct,
    targetLabel,
    currentLabel,
  }
}

// ------------------- component -------------------

export default function GoalsManager({ navigate }) {
  const [loading, setLoading] = useState(true)
  const [goalSets, setGoalSets] = useState([])

  // Game / practice data for metric calculations
  const [gameEvents, setGameEvents] = useState([])
  const [practiceEntries, setPracticeEntries] = useState([])

  // Create/Edit set state
  const [setName, setSetName] = useState("")
  const [setType, setSetType] = useState("practice")
  const [setStartDate, setSetStartDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  )
  const [setDueDate, setSetDueDate] = useState("")
  const [editingSetId, setEditingSetId] = useState(null)

  // Add goal to set state
  const [selectedSetIdForGoal, setSelectedSetIdForGoal] = useState("")
  const [goalName, setGoalName] = useState("")
  const [goalDetails, setGoalDetails] = useState("")
  const [goalMetric, setGoalMetric] = useState(
    BASE_METRIC_OPTIONS[0]?.value || "",
  )
  const [goalTarget, setGoalTarget] = useState("")
  const [goalEndDate, setGoalEndDate] = useState("")
  const [goalTargetType, setGoalTargetType] = useState("percent")
  const [goalZoneId, setGoalZoneId] = useState("")

  // expanded sets in list
  const [expandedSetIds, setExpandedSetIds] = useState(new Set())

  // accordion state for forms
  const [openCreateSet, setOpenCreateSet] = useState(false)
  const [openAddGoal, setOpenAddGoal] = useState(false)

  // Initial load of goal sets + game/practice data
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [sets, user] = await Promise.all([
          listGoalSetsWithGoals(),
          getUser(),
        ])

        let gameEv = []
        let pracEv = []

        if (user?.id) {
          const userId = user.id
          const [{ data: gameData, error: gameErr }, { data: pracData, error: pracErr }] =
            await Promise.all([
              supabase
                .from("game_events")
                .select("*")
                .eq("user_id", userId)
                .order("ts", { ascending: true }),
              supabase
                .from("practice_entries")
                .select("*")
                .eq("user_id", userId)
                .order("ts", { ascending: true }),
            ])

          if (gameErr) {
            console.warn("[GoalsManager] game_events fetch error:", gameErr)
          }
          if (pracErr) {
            console.warn(
              "[GoalsManager] practice_entries fetch error:",
              pracErr,
            )
          }

          gameEv = gameData || []
          pracEv = pracData || []
        }

        if (cancelled) return

        setGoalSets(sets || [])
        setGameEvents(gameEv)
        setPracticeEntries(pracEv)

        if (!selectedSetIdForGoal && sets && sets.length) {
          setSelectedSetIdForGoal(sets[0].id)
        }
      } catch (err) {
        console.warn("[GoalsManager] load error:", err)
        if (!cancelled) {
          setGoalSets([])
          setGameEvents([])
          setPracticeEntries([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sortedSets = useMemo(
    () =>
      [...goalSets].sort((a, b) =>
        (a.due_date || "").localeCompare(b.due_date || ""),
      ),
    [goalSets],
  )

  const selectedSetForGoal = useMemo(
    () => goalSets.find((s) => s.id === selectedSetIdForGoal) || null,
    [goalSets, selectedSetIdForGoal],
  )

  // Metric options depend on selected set type:
  // - Practice set → base metrics
  // - Game set → base + game-only metrics
  const availableMetricOptions = useMemo(() => {
    if (!selectedSetForGoal) return BASE_METRIC_OPTIONS
    if (selectedSetForGoal.type === "game") {
      return [...BASE_METRIC_OPTIONS, ...GAME_ONLY_METRIC_OPTIONS]
    }
    return BASE_METRIC_OPTIONS
  }, [selectedSetForGoal])

  // Default goalEndDate to selected set's due date
  useEffect(() => {
    if (selectedSetForGoal?.due_date) {
      setGoalEndDate((prev) => prev || selectedSetForGoal.due_date)
    } else {
      setGoalEndDate("")
    }
  }, [selectedSetForGoal])

  // Make sure goalMetric is always valid for current set type
  useEffect(() => {
    if (!availableMetricOptions.length) return
    const isValid = availableMetricOptions.some((opt) => opt.value === goalMetric)
    if (!isValid) {
      setGoalMetric(availableMetricOptions[0].value)
    }
  }, [availableMetricOptions, goalMetric])

  function resetSetForm() {
    setSetName("")
    setSetType("practice")
    setSetStartDate(new Date().toISOString().slice(0, 10))
    setSetDueDate("")
    setEditingSetId(null)
  }

  async function handleCreateOrUpdateSet(e) {
    e.preventDefault()
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
          prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
        )
      } else {
        const created = await createGoalSet({
          name: setName,
          type: setType,
          startDate: setStartDate,
          dueDate: setDueDate,
        })
        setGoalSets((prev) => [...prev, { ...created, goals: [] }])
        if (!selectedSetIdForGoal) setSelectedSetIdForGoal(created.id)
      }
      resetSetForm()
    } catch (err) {
      console.warn("[GoalsManager] handleCreateOrUpdateSet error:", err)
      alert("Could not save goal set.")
    }
  }

  function startEditSet(set) {
    setEditingSetId(set.id)
    setSetName(set.name || "")
    setSetType(set.type || "practice")
    setSetStartDate(
      set.start_date || new Date().toISOString().slice(0, 10),
    )
    setSetDueDate(set.due_date || "")
    // Open the accordion when editing
    setOpenCreateSet(true)
  }

  async function handleDeleteSet(set) {
    const ok = window.confirm(
      "Delete this Goal Set and all goals within it? This cannot be undone.",
    )
    if (!ok) return
    try {
      await deleteGoalsBySet(set.id)
      await deleteGoalSet(set.id)
      setGoalSets((prev) => prev.filter((s) => s.id !== set.id))

      if (selectedSetIdForGoal === set.id) {
        const remaining = goalSets.filter((s) => s.id !== set.id)
        setSelectedSetIdForGoal(remaining[0]?.id || "")
      }
    } catch (err) {
      console.warn("[GoalsManager] handleDeleteSet error:", err)
      alert("Could not delete goal set.")
    }
  }

  async function handleAddGoal(e) {
    e.preventDefault()
    if (
      !selectedSetIdForGoal ||
      !goalMetric ||
      !goalTarget ||
      !goalEndDate ||
      !goalTargetType
    )
      return

    if (goalMetric === "fg_pct_zone" && !goalZoneId) {
      alert("Please select a zone for FG% (by zone) goals.")
      return
    }

    if (
      selectedSetForGoal?.due_date &&
      goalEndDate > selectedSetForGoal.due_date
    ) {
      alert("Target end date cannot be after the goal set due date.")
      return
    }

    try {
      const created = await createGoal({
        setId: selectedSetIdForGoal,
        name: goalName || metricLabel(goalMetric),
        details:
          goalDetails ||
          (goalMetric === "fg_pct_zone" && goalZoneId
            ? zoneLabel(goalZoneId)
            : ""),
        metric: goalMetric,
        targetValue: Number(goalTarget),
        targetEndDate: goalEndDate,
        targetType: goalTargetType,
        zoneId: goalMetric === "fg_pct_zone" ? goalZoneId || null : null,
      })

      setGoalSets((prev) =>
        prev.map((s) =>
          s.id === selectedSetIdForGoal
            ? { ...s, goals: [...(s.goals || []), created] }
            : s,
        ),
      )

      setGoalName("")
      setGoalDetails("")
      setGoalMetric(availableMetricOptions[0]?.value || "")
      setGoalTarget("")
      setGoalEndDate(selectedSetForGoal?.due_date || "")
      setGoalTargetType("percent")
      setGoalZoneId("")
      setExpandedSetIds((old) => new Set(old).add(selectedSetIdForGoal))
      setOpenAddGoal(true)
    } catch (err) {
      console.warn("[GoalsManager] handleAddGoal error:", err)
      alert("Could not add goal.")
    }
  }

  async function handleDeleteGoal(goal) {
    const ok = window.confirm("Delete this goal?")
    if (!ok) return
    try {
      await deleteGoal(goal.id)
      setGoalSets((prev) =>
        prev.map((s) => ({
          ...s,
          goals: (s.goals || []).filter((g) => g.id !== goal.id),
        })),
      )
    } catch (err) {
      console.warn("[GoalsManager] handleDeleteGoal error:", err)
      alert("Could not delete goal.")
    }
  }

  function toggleExpanded(setId) {
    setExpandedSetIds((old) => {
      const next = new Set(old)
      if (next.has(setId)) next.delete(setId)
      else next.add(setId)
      return next
    })
  }

  const addGoalDisabled =
    !selectedSetIdForGoal ||
    !goalMetric ||
    !goalTarget ||
    !goalEndDate ||
    (goalMetric === "fg_pct_zone" && !goalZoneId)

  // ------------------- render -------------------

  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
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
        {/* Create New Goal Set (Accordion) */}
        <section className="rounded-2xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setOpenCreateSet((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 accordion-header"
          >
            <span className="text-xs font-semibold text-slate-800">
              Create New Goal Set
            </span>
            <ChevronDown
              size={18}
              className={`transition-transform ${
                openCreateSet ? "rotate-180" : ""
              }`}
            />
          </button>

          {openCreateSet && (
            <div className="border-t border-slate-100 p-4 space-y-3">
              <form className="space-y-3" onSubmit={handleCreateOrUpdateSet}>
                <input
                  type="text"
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400"
                  placeholder="Set name (e.g., December Shooting Block)"
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                />

                <select
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900"
                  value={setType}
                  onChange={(e) => setSetType(e.target.value)}
                >
                  <option value="practice">Practice</option>
                  <option value="game">Game</option>
                </select>

                {/* Start Date */}
                <div className="relative">
                  <input
                    type="date"
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 pr-9 text-sm text-slate-900 placeholder:text-slate-400"
                    value={setStartDate}
                    onChange={(e) => setSetStartDate(e.target.value)}
                  />
                  <Calendar
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                {/* Due Date */}
                <div className="relative">
                  <input
                    type="date"
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 pr-9 text-sm text-slate-900 placeholder:text-slate-400"
                    value={setDueDate}
                    onChange={(e) => setSetDueDate(e.target.value)}
                  />
                  <Calendar
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full h-10 rounded-lg bg-sky-600 text-white text-sm font-semibold"
                >
                  {editingSetId ? "Update Set" : "Create Set"}
                </button>
              </form>
            </div>
          )}
        </section>

        {/* Add Goal to Set (Accordion) */}
        <section className="rounded-2xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setOpenAddGoal((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 accordion-header"
          >
            <span className="text-xs font-semibold text-slate-800">
              Add Goal to Set
            </span>
            <ChevronDown
              size={18}
              className={`transition-transform ${
                openAddGoal ? "rotate-180" : ""
              }`}
            />
          </button>

          {openAddGoal && (
            <div className="border-t border-slate-100 p-4 space-y-3">
              <form className="space-y-3" onSubmit={handleAddGoal}>
                <select
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900"
                  value={selectedSetIdForGoal}
                  onChange={(e) => setSelectedSetIdForGoal(e.target.value)}
                >
                  <option value="">Select Goal Set</option>
                  {sortedSets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.type === "game" ? "Game" : "Practice"})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400"
                  placeholder="Goal Name (e.g., FG% by Zone)"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                />

                <input
                  type="text"
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400"
                  placeholder="Details (e.g., Left Wing 3s · 30 days)"
                  value={goalDetails}
                  onChange={(e) => setGoalDetails(e.target.value)}
                />

                {/* Metric */}
                <select
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900"
                  value={goalMetric}
                  onChange={(e) => {
                    setGoalMetric(e.target.value)
                    if (e.target.value !== "fg_pct_zone") {
                      setGoalZoneId("")
                    }
                  }}
                >
                  {availableMetricOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                {/* Zone selector: only when FG% (by zone) */}
                {goalMetric === "fg_pct_zone" && (
                  <select
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900"
                    value={goalZoneId}
                    onChange={(e) => setGoalZoneId(e.target.value)}
                  >
                    <option value="">Select Zone</option>
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* Target End Date */}
                <div className="relative">
                  <input
                    type="date"
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 pr-9 text-sm text-slate-900 placeholder:text-slate-400"
                    value={goalEndDate}
                    onChange={(e) => setGoalEndDate(e.target.value)}
                    max={selectedSetForGoal?.due_date || undefined}
                  />
                  <Calendar
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                {/* Target value + type */}
                <label className="block text-xs font-medium text-slate-700">
                  Target
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      className="col-span-2 h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400"
                      placeholder="Target Value (e.g., 44)"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                    />

                    <select
                      className="col-span-1 h-10 rounded-lg border border-slate-300 px-2 text-sm text-slate-900"
                      value={goalTargetType}
                      onChange={(e) => setGoalTargetType(e.target.value)}
                    >
                      <option value="total">Total</option>
                      <option value="percent">%</option>
                    </select>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={addGoalDisabled}
                  className="btn btn-primary w-full h-10 rounded-lg bg-sky-600 text-white text-sm font-semibold disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Add Goal
                </button>
              </form>
            </div>
          )}
        </section>

        {/* Active Goal Sets */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-slate-800">
            Active Goal Sets
          </h2>

          {loading && (
            <div className="text-sm text-slate-500">Loading goals…</div>
          )}

          {!loading && sortedSets.length === 0 && (
            <div className="text-sm text-slate-500">
              No goal sets yet. Create one above to get started.
            </div>
          )}

          {sortedSets.map((set) => {
            const dLeft = daysLeft(set.due_date)
            const tagLabel =
              set.type === "game"
                ? "Game"
                : set.type === "practice"
                ? "Practice"
                : set.type

            const isExpanded = expandedSetIds.has(set.id)

            return (
              <div
                key={set.id}
                className="rounded-2xl border border-slate-200 bg-white"
              >
                {/* Set header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpanded(set.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      toggleExpanded(set.id)
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
                >
                  <div className="flex items-start gap-2 text-left">
                    <MdEmojiObjects
                      size={18}
                      className="mt-0.5 text-amber-500"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {set.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {set.start_date && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">From:</span>
                            {formatDueDate(set.start_date)}
                          </span>
                        )}
                        {set.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDueDate(set.due_date)}
                          </span>
                        )}
                        {dLeft != null && (
                          <span className="text-[11px] text-slate-500">
                            {dLeft >= 0
                              ? `${dLeft} day${dLeft === 1 ? "" : "s"} left`
                              : `${Math.abs(
                                  dLeft,
                                )} day${
                                  Math.abs(dLeft) === 1 ? "" : "s"
                                } ago`}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            set.type === "game"
                              ? "bg-sky-50 text-sky-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {tagLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        startEditSet(set)
                      }}
                      className="edit-btn p-1 rounded-full hover:bg-slate-100"
                      aria-label="Edit goal set"
                    >
                      <Edit2 size={14} className="text-slate-500" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSet(set)
                      }}
                      className="trash-btn p-1 rounded-full hover:bg-slate-100"
                      aria-label="Delete goal set"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Goals list */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-3 space-y-3">
                    {set.goals && set.goals.length > 0 ? (
                      set.goals.map((g) => {
                        const progress = computeGoalProgress({
                          goal: g,
                          set,
                          gameEvents,
                          practiceEntries,
                        })

                        return (
                          <GoalCard
                            key={g.id}
                            goal={g}
                            progress={progress}
                            onDelete={() => handleDeleteGoal(g)}
                          />
                        )
                      })
                    ) : (
                      <div className="text-xs text-slate-500">
                        No goals yet in this set.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      </main>
    </div>
  )
}

// ------------------- goal card -------------------

function GoalCard({ goal, progress, onDelete }) {
  const { progressPct, targetLabel, currentLabel, targetRaw } = progress || {}
  const pct = Number.isFinite(progressPct) ? progressPct : 0
  const zoneName =
    goal.metric === "fg_pct_zone" ? zoneLabel(goal.zone_id) : null

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {goal.name || metricLabel(goal.metric)}
          </div>
          {(goal.details || zoneName) && (
            <div className="text-xs text-slate-500">
              {goal.details}
              {goal.details && zoneName ? " · " : ""}
              {zoneName}
            </div>
          )}
          {goal.target_end_date && (
            <div className="text-[11px] text-slate-400">
              Target by: {formatDueDate(goal.target_end_date)}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="h-7 px-3 rounded-full bg-red-50 text-[11px] font-semibold text-red-600"
        >
          Delete
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-sky-500 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[11px] text-slate-600 whitespace-nowrap">
          {targetRaw
            ? `Target: ${targetLabel} · Value: ${currentLabel}`
            : `Target: — · Value: ${currentLabel}`}
        </div>
      </div>
    </div>
  )
}
