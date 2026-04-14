import { ChevronDown, ChevronUp } from "lucide-react"

export default function PerformanceSectionHeader({
  title,
  expanded,
  onToggle,
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="accordion-header flex w-full items-center justify-between px-4 py-3"
    >
      <span className="text-xs font-semibold text-slate-900">{title}</span>
      {expanded ? (
        <ChevronUp size={16} className="text-slate-500" />
      ) : (
        <ChevronDown size={16} className="text-slate-500" />
      )}
    </button>
  )
}
