export default function PerformanceMetricCard({
  label,
  fgPct,
  attempts,
  attemptsLabel,
  goalPct,
  mode,
  totalAttempts,
}) {
  const isAttempts = mode === "attempts"
  const volumePct =
    totalAttempts > 0 ? Math.round((attempts / totalAttempts) * 100) : 0
  const pctVal = Number.isFinite(fgPct) ? Math.round(fgPct) : 0
  const goalVal =
    typeof goalPct === "number" && Number.isFinite(goalPct)
      ? Math.round(goalPct)
      : null

  const displayValue = isAttempts ? attempts : pctVal
  const displaySuffix = isAttempts ? "" : "%"
  const subtitle = isAttempts ? `${volumePct}% of total volume` : attemptsLabel
  const progressPct = isAttempts
    ? volumePct
    : goalVal && goalVal > 0
      ? Math.max(0, Math.min(100, (pctVal / goalVal) * 100))
      : pctVal

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <div className="text-xs font-medium text-slate-700">{label}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">{subtitle}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-sky-700">
            {displayValue}
            {displaySuffix && (
              <span className="ml-0.5 text-[11px] font-normal text-slate-500">
                {displaySuffix}
              </span>
            )}
          </div>
          {!isAttempts && goalVal != null && (
            <div className="text-[11px] text-slate-500">Goal: {goalVal}%</div>
          )}
        </div>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  )
}
