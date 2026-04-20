import React from "react"
import { Trash2 } from "lucide-react"

import { formatDueDate } from "../../lib/goals-ui"
import {
  metricLabel,
  zoneLabel,
  ZONE_METRICS,
} from "../../lib/goal-metrics"

export default function GoalCard({ goal, progress, onDelete }) {
  const { progressPct, targetLabel, currentLabel, targetRaw } = progress || {}
  const pct = Number.isFinite(progressPct) ? progressPct : 0

  const isZoneMetric = ZONE_METRICS.has(goal.metric)
  const zoneName = isZoneMetric ? zoneLabel(goal.zone_id) : null

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
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="trash-btn p-1 rounded-full hover:bg-slate-100"
            aria-label="Delete goal"
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
        )}
      </div>

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
