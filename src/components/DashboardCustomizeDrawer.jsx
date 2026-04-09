export default function DashboardCustomizeDrawer({
  activeAthleteName,
  draftMetrics,
  draftError,
  savingDashboardMetrics,
  metricGroups,
  rangeOptions,
  sourceFlags,
  toSourceMode,
  closeCustomizeDrawer,
  addDraftMetric,
  removeDraftMetric,
  updateDraftMetric,
}) {
  return (
    <div className="fixed inset-0 z-30">
      <button
        type="button"
        aria-label="Close customize dashboard"
        className="absolute inset-0 bg-slate-900/30"
        onClick={closeCustomizeDrawer}
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-xl border-l border-slate-200 flex flex-col">
        <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Customize Dashboard</h3>
            <p className="text-xs text-slate-500">{activeAthleteName}</p>
          </div>
          <button
            type="button"
            className="h-8 rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-700"
            onClick={closeCustomizeDrawer}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <button
            type="button"
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700"
            onClick={addDraftMetric}
            disabled={draftMetrics.length >= 5}
          >
            Add metric
          </button>

          {draftMetrics.map((row, index) => {
            const flags = sourceFlags(row.sourceMode)
            return (
              <div key={`metric-row-${index}`} className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Metric {index + 1}
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-rose-600"
                    onClick={() => removeDraftMetric(index)}
                  >
                    Remove
                  </button>
                </div>

                <label className="block text-xs font-medium text-slate-700" htmlFor={`metric-${index}`}>
                  Metric
                </label>
                <select
                  id={`metric-${index}`}
                  aria-label="Metric"
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
                  value={row.metricKey}
                  onChange={(e) => updateDraftMetric(index, { metricKey: e.target.value })}
                >
                  <option value="">Select metric</option>
                  {metricGroups.map((group) => (
                    <optgroup
                      key={`${group.category}-${group.subcategory}`}
                      label={`${group.category} / ${group.subcategory}`}
                    >
                      {group.options.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-700">Range</div>
                  <div className="flex flex-wrap gap-1.5">
                    {rangeOptions.map((rangeKey) => (
                      <button
                        key={`${index}-${rangeKey}`}
                        type="button"
                        onClick={() => updateDraftMetric(index, { rangeKey })}
                        className={`h-8 rounded-full border px-2.5 text-xs font-semibold ${
                          row.rangeKey === rangeKey
                            ? "border-sky-600 bg-sky-50 text-sky-700"
                            : "border-slate-300 text-slate-700"
                        }`}
                      >
                        {rangeKey}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-700">Source</div>
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        aria-label="Game"
                        checked={flags.game}
                        onChange={(e) => {
                          const nextMode = toSourceMode(e.target.checked, flags.practice)
                          if (!nextMode) return
                          updateDraftMetric(index, { sourceMode: nextMode })
                        }}
                      />
                      Game
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        aria-label="Practice"
                        checked={flags.practice}
                        onChange={(e) => {
                          const nextMode = toSourceMode(flags.game, e.target.checked)
                          if (!nextMode) return
                          updateDraftMetric(index, { sourceMode: nextMode })
                        }}
                      />
                      Practice
                    </label>
                  </div>
                </div>
              </div>
            )
          })}

          {draftError && (
            <div className="text-xs text-red-600">{draftError}</div>
          )}
        </div>

        <div className="border-t border-slate-200 p-4 flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            {savingDashboardMetrics ? "Saving changes..." : "Changes save automatically"}
          </div>
          <button
            type="button"
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700"
            onClick={closeCustomizeDrawer}
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  )
}
