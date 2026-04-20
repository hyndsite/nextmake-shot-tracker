import React from "react"
import { Archive, Calendar, Edit2, Trash2 } from "lucide-react"
import { MdEmojiObjects } from "react-icons/md"

import GoalCard from "./GoalCard"
import { daysLeft, formatDueDate } from "../../lib/goals-ui"

function typeLabel(type) {
  if (type === "game") return "Game"
  if (type === "practice") return "Practice"
  return type
}

export default function GoalSetCard({
  set,
  isArchived = false,
  isExpanded,
  onToggleExpanded,
  onStartEdit,
  onDeleteSet,
  onArchiveSet,
  onDeleteGoal,
  getGoalProgress,
}) {
  const dLeft = daysLeft(set.due_date)
  const tagLabel = typeLabel(set.type)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggleExpanded(set.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onToggleExpanded(set.id)
          }
        }}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
      >
        <div className="flex items-start gap-2 text-left">
          <MdEmojiObjects size={18} className="mt-0.5 text-amber-500" />
          <div>
            <div className="text-sm font-semibold text-slate-900">{set.name}</div>
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
              {!isArchived && dLeft != null && (
                <span className="text-[11px] text-slate-500">
                  {dLeft >= 0
                    ? `${dLeft} day${dLeft === 1 ? "" : "s"} left`
                    : `${Math.abs(dLeft)} day${Math.abs(dLeft) === 1 ? "" : "s"} ago`}
                </span>
              )}
              {isArchived && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700">
                  Archived
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

        {!isArchived && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onStartEdit(set)
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
                onDeleteSet(set)
              }}
              className="trash-btn p-1 rounded-full hover:bg-slate-100"
              aria-label="Delete goal set"
            >
              <Trash2 size={14} className="text-red-500" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onArchiveSet(set)
              }}
              className="archive-btn p-1 rounded-full hover:bg-slate-100"
              aria-label="Archive goal set"
            >
              <Archive size={14} className="text-slate-500" />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          {set.goals && set.goals.length > 0 ? (
            set.goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                progress={getGoalProgress(goal, set)}
                onDelete={isArchived ? null : () => onDeleteGoal(goal)}
              />
            ))
          ) : (
            <div className="text-xs text-slate-500">
              {isArchived ? "No goals in this archived set." : "No goals yet in this set."}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
