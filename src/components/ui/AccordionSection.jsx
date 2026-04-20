import React from "react"
import { ChevronDown } from "lucide-react"

export default function AccordionSection({
  title,
  open,
  onToggle,
  children,
  className = "rounded-2xl border border-slate-200 bg-white",
  headerClassName = "w-full flex items-center justify-between px-4 py-3 accordion-header",
  contentClassName = "border-t border-slate-100 p-4 space-y-3",
  headerRight,
}) {
  return (
    <section className={className}>
      <button type="button" onClick={onToggle} className={headerClassName}>
        <span className="text-xs font-semibold text-slate-800">{title}</span>
        {headerRight || (
          <span
            aria-hidden="true"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <ChevronDown size={18} />
          </span>
        )}
      </button>

      {open && <div className={contentClassName}>{children}</div>}
    </section>
  )
}
