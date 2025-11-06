// src/screens/GoalsManager.jsx
import React, { useEffect, useMemo, useState } from "react"
import {
  createGoalSet,
  updateGoalSet,
  deleteGoalSet,
  deleteGoalsBySet,
  listGoalSetsWithGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from "../lib/goals-db"
import { ArrowLeft, Calendar, Edit2, Trash2 } from "lucide-react"
import { MdEmojiObjects } from "react-icons/md"

/**
 * Metric options for goals
 *
 * BASE_METRIC_OPTIONS = metrics valid for both Practice + Game
 * GAME_ONLY_METRIC_OPTIONS = metrics that only make sense for Game goal sets
 */

// Available for both Practice and Game goal sets
const BASE_METRIC_OPTIONS = [
  { value: "efg_overall", label: "eFG% (overall)" },
  { value: "three_pct_overall", label: "3P% (overall)" },
  { value: "ft_pct", label: "FT%" },
  { value: "fg_pct_zone", label: "FG% (by zone)" },
  { value: "off_dribble_fg", label: "Off-Dribble FG%" },
  { value: "pressured_fg", label: "Pressured FG%" },
  { value: "makes", label: "Makes (count)" },
  { value: "attempts", label: "Attempts (count)" },
]

// Only for Game goal sets (we track these only in games)
const GAME_ONLY_METRIC_OPTIONS = [
  { value: "points_total", label: "Total Points (Game)" },
  { value: "steals_total", label: "Steals (Game)" },
  { value: "assists_total", label: "Assists (Game)" },
  { value: "rebounds_total", label: "Rebounds (Game)" },
]

// Used for label lookup everywhere (Goal cards, etc.)
const ALL_METRIC_OPTIONS = [...BASE_METRIC_OPTIONS, ...GAME_ONLY_METRIC_OPTIONS]

function metricLabel(value) {
  return ALL_METRIC_OPTIONS.find((m) => m.value === value)?.label || value
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

export default function GoalsManager({ navigate }) {
  const [loading, setLoading] = useState(true)
  const [goalSets, setGoalSets] = useState([])

  // Create/Edit set state
  const [setName, setSetName] = useState("")
  const [setType, setSetType] = useState("practice")
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

  // Which sets are expanded in the list
  const [expandedSetIds, setExpandedSetIds] = useState(new Set())

  // Initial load of all goal sets/goals (from Supabase via goals-db.js)
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const sets = await listGoalSetsWithGoals()
        if (cancelled) return
        setGoalSets(sets || [])
        if (!selectedSetIdForGoal && sets && sets.length) {
          setSelectedSetIdForGoal(sets[0].id)
        }
      } catch (err) {
        console.warn("[GoalsManager] load error:", err)
        if (!cancelled) {
          setGoalSets([])
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
  // - Game set → base metrics + game-only metrics
  const availableMetricOptions = useMemo(() => {
    if (!selectedSetForGoal) return BASE_METRIC_OPTIONS
    if (selectedSetForGoal.type === "game") {
      return [...BASE_METRIC_OPTIONS, ...GAME_ONLY_METRIC_OPTIONS]
    }
    return BASE_METRIC_OPTIONS
  }, [selectedSetForGoal])

  // Keep goalEndDate aligned with selected set (default to set due date)
  useEffect(() => {
    if (selectedSetForGoal?.due_date) {
      setGoalEndDate((prev) => prev || selectedSetForGoal.due_date)
    } else {
      setGoalEndDate("")
    }
  }, [selectedSetForGoal])

  // Ensure goalMetric is always valid for the currently selected set type
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
    setSetDueDate("")
    setEditingSetId(null)
  }

  async function handleCreateOrUpdateSet(e) {
    e.preventDefault()
    if (!setName || !setDueDate) return

    try {
      if (editingSetId) {
        const updated = await updateGoalSet(editingSetId, {
          name: setName,
          type: setType,
          due_date: setDueDate,
        })
        setGoalSets((prev) =>
          prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
        )
      } else {
        const created = await createGoalSet({
          name: setName,
          type: setType,
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
    setSetDueDate(set.due_date || "")
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
      !goalEndDate
    )
      return

    // Safety: ensure end date does not exceed set due date (in case max attr is bypassed)
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
        details: goalDetails || "",
        metric: goalMetric,
        targetValue: Number(goalTarget),
        targetEndDate: goalEndDate,
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
      setExpandedSetIds((old) => new Set(old).add(selectedSetIdForGoal))
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
          {/* right-side avatar placeholder */}
          <div className="w-8 h-8 rounded-full bg-slate-200" />
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto p-4 pb-24 space-y-4">
        {/* Create New Goal Set */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-800">
            Create New Goal Set
          </h2>

          <form className="space-y-3" onSubmit={handleCreateOrUpdateSet}>
            <input
              type="text"
              className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder="Set name (e.g., Preseason Block)"
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
        </section>

        {/* Add Goal to Set */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-800">
            Add Goal to Set
          </h2>

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
              placeholder="Details (e.g., 30 days · Wing Right)"
              value={goalDetails}
              onChange={(e) => setGoalDetails(e.target.value)}
            />

            {/* Metric options now depend on set type */}
            <select
              className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900"
              value={goalMetric}
              onChange={(e) => setGoalMetric(e.target.value)}
            >
              {availableMetricOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Target End Date (per goal, cannot exceed set due date) */}
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

            <input
              type="number"
              className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder="Target Value (e.g., 45)"
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
            />

            <button
              type="submit"
              disabled={
                !selectedSetIdForGoal ||
                !goalMetric ||
                !goalTarget ||
                !goalEndDate
              }
              className="btn btn-primary w-full h-10 rounded-lg bg-sky-600 text-white text-sm font-semibold disabled:bg-slate-200 disabled:text-slate-400"
            >
              Add Goal
            </button>
          </form>
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
                      <div className="flex items-center gap-2 text-xs text-slate-500">
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
                      className="p-1 rounded-full hover:bg-slate-100"
                      aria-label="Edit goal set"
                    >
                      <Edit2 size={14} className="edit-btn text-slate-500" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSet(set)
                      }}
                      className="p-1 rounded-full hover:bg-slate-100"
                      aria-label="Delete goal set"
                    >
                      <Trash2 size={14} className="trash-can text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Goals list */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-3 space-y-3">
                    {set.goals && set.goals.length > 0 ? (
                      set.goals.map((g) => (
                        <GoalCard
                          key={g.id}
                          goal={g}
                          onDelete={() => handleDeleteGoal(g)}
                        />
                      ))
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

/* ---------------- goal card ---------------- */

function GoalCard({ goal, onDelete }) {
  const target = Number(goal.target_value ?? 0)
  const current = Number(goal.current_value ?? 0)
  const pct =
    target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {goal.name || metricLabel(goal.metric)}
          </div>
          {goal.details && (
            <div className="text-xs text-slate-500">{goal.details}</div>
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
          {target
            ? `Target: ${target} · Value: ${current || 0}`
            : `Target: — · Value: ${current || 0}`}
        </div>
      </div>
    </div>
  )
}
