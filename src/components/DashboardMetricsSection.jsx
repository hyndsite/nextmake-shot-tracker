import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { fmtValue } from "../lib/dashboard-formatters"

export default function DashboardMetricsSection({
  subtitle,
  loading,
  error,
  cards,
  removingMetricPosition,
  onAddMetric,
  onRemoveMetric,
}) {
  return (
    <section className="card space-y-3">
      <div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Dashboard Metrics</h3>
          <div className="text-xs text-slate-500">{subtitle}</div>
        </div>
      </div>
      {loading && (
        <div className="text-xs text-slate-500">Loading dashboard metrics...</div>
      )}
      {error && (
        <div className="text-xs text-red-600">{error}</div>
      )}
      {cards.length > 0 && (
        <div className="space-y-2">
          {cards.map((card) => (
            <div key={card.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">{card.label}</div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500">
                    {card.rangeKey} • {card.sourceLabel}
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-rose-600 disabled:opacity-50"
                    aria-label={`Remove ${card.label}`}
                    onClick={() => onRemoveMetric(card.position)}
                    disabled={removingMetricPosition === card.position}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={120}>
                  <LineChart data={card.series.points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="dayKey" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => fmtValue(value, card.format)} />
                    {(card.sourceMode === "both" || card.sourceMode === "game") && (
                      <Line
                        type="monotone"
                        dataKey="game"
                        stroke="#0EA5E9"
                        dot={false}
                        strokeWidth={2}
                        name="Game"
                      />
                    )}
                    {(card.sourceMode === "both" || card.sourceMode === "practice") && (
                      <Line
                        type="monotone"
                        dataKey="practice"
                        stroke="#10B981"
                        dot={false}
                        strokeWidth={2}
                        name="Practice"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}
      {cards.length < 5 && (
        <button
          type="button"
          className="group w-1/2 aspect-square rounded-2xl border-2 border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 text-sm font-semibold text-slate-700 shadow-[0_5px_12px_-9px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.85)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_14px_-10px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] active:translate-y-0 active:shadow-[0_3px_8px_-7px_rgba(15,23,42,0.32),inset_0_1px_0_rgba(255,255,255,0.8)]"
          onClick={onAddMetric}
        >
          <span className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/80 px-3 py-1 shadow-sm">
            + Add Metric
          </span>
        </button>
      )}
    </section>
  )
}
