import React from "react"
import { Calendar } from "lucide-react"
import AccordionSection from "../ui/AccordionSection"

export default function GoalSetFormSection({
  open,
  editingSetId,
  setName,
  setType,
  setStartDate,
  setDueDate,
  onToggle,
  onSubmit,
  onSetNameChange,
  onSetTypeChange,
  onSetStartDateChange,
  onSetDueDateChange,
}) {
  return (
    <AccordionSection title="Create New Goal Set" open={open} onToggle={onToggle}>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input
          type="text"
          className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400"
          placeholder="Set name (e.g., December Shooting Block)"
          value={setName}
          onChange={(e) => onSetNameChange(e.target.value)}
        />

        <select
          className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900"
          value={setType}
          onChange={(e) => onSetTypeChange(e.target.value)}
        >
          <option value="practice">Practice</option>
          <option value="game">Game</option>
        </select>

        <div className="relative">
          <input
            type="date"
            className="w-full h-10 rounded-lg border border-slate-300 px-3 pr-9 text-sm text-slate-900 placeholder:text-slate-400"
            value={setStartDate}
            onChange={(e) => onSetStartDateChange(e.target.value)}
          />
          <Calendar
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        <div className="relative">
          <input
            type="date"
            className="w-full h-10 rounded-lg border border-slate-300 px-3 pr-9 text-sm text-slate-900 placeholder:text-slate-400"
            value={setDueDate}
            onChange={(e) => onSetDueDateChange(e.target.value)}
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
    </AccordionSection>
  )
}
