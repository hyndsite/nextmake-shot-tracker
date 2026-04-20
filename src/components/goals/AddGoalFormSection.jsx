import React from "react"
import { Calendar } from "lucide-react"

import { ZONES } from "../../constants/zones"
import { ZONE_METRICS } from "../../lib/goal-metrics"
import AccordionSection from "../ui/AccordionSection"

export default function AddGoalFormSection({
  open,
  activeSorted,
  selectedSetIdForGoal,
  goalName,
  goalDetails,
  goalMetric,
  goalZoneId,
  goalEndDate,
  goalTarget,
  goalTargetType,
  selectedSetForGoal,
  availableMetricOptions,
  addGoalDisabled,
  onToggle,
  onSubmit,
  onSelectedSetChange,
  onGoalNameChange,
  onGoalDetailsChange,
  onGoalMetricChange,
  onGoalZoneIdChange,
  onGoalEndDateChange,
  onGoalTargetChange,
  onGoalTargetTypeChange,
}) {
  return (
    <AccordionSection title="Add Goal to Set" open={open} onToggle={onToggle}>
      <form className="space-y-3" onSubmit={onSubmit}>
        <select
          className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900"
          value={selectedSetIdForGoal}
          onChange={(e) => onSelectedSetChange(e.target.value)}
        >
          <option value="">Select Goal Set</option>
          {activeSorted.map((set) => (
            <option key={set.id} value={set.id}>
              {set.name} ({set.type === "game" ? "Game" : "Practice"})
            </option>
          ))}
        </select>

        <input
          type="text"
          className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400"
          placeholder="Goal Name (e.g., FG% by Zone)"
          value={goalName}
          onChange={(e) => onGoalNameChange(e.target.value)}
        />

        <input
          type="text"
          className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400"
          placeholder="Details (e.g., Left Wing 3s · 30 days)"
          value={goalDetails}
          onChange={(e) => onGoalDetailsChange(e.target.value)}
        />

        <select
          className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900"
          value={goalMetric}
          onChange={(e) => onGoalMetricChange(e.target.value)}
        >
          {availableMetricOptions.map((metric) => (
            <option key={metric.value} value={metric.value}>
              {metric.label}
            </option>
          ))}
        </select>

        {ZONE_METRICS.has(goalMetric) && (
          <select
            className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900"
            value={goalZoneId}
            onChange={(e) => onGoalZoneIdChange(e.target.value)}
          >
            <option value="">Select Zone</option>
            {ZONES.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.label}
              </option>
            ))}
          </select>
        )}

        <div className="relative">
          <input
            type="date"
            className="w-full h-10 rounded-lg border border-slate-300 px-3 pr-9 text-sm text-slate-900 placeholder:text-slate-400"
            value={goalEndDate}
            onChange={(e) => onGoalEndDateChange(e.target.value)}
            max={selectedSetForGoal?.due_date || undefined}
          />
          <Calendar
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        <label className="block text-xs font-medium text-slate-700">
          Target
          <div className="mt-1 grid grid-cols-3 gap-2">
            <input
              type="number"
              className="col-span-2 h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder="Target Value (e.g., 44)"
              value={goalTarget}
              onChange={(e) => onGoalTargetChange(e.target.value)}
            />

            <select
              className="col-span-1 h-10 rounded-lg border border-slate-300 px-2 text-sm text-slate-900"
              value={goalTargetType}
              onChange={(e) => onGoalTargetTypeChange(e.target.value)}
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
    </AccordionSection>
  )
}
