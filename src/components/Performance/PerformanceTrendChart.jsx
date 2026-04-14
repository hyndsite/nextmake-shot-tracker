import { Filter as FilterIcon } from "lucide-react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

function formatSelectedDate(payload) {
  if (!payload) return "—"

  const candidate =
    payload.date ||
    payload.date_iso ||
    payload.ts ||
    payload.label ||
    payload.start ||
    payload.end

  if (!candidate) return "—"

  if (typeof candidate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    const parsed = new Date(`${candidate}T00:00:00Z`)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    }
  }

  const parsed = new Date(candidate)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return String(candidate)
}

export default function PerformanceTrendChart({
  title,
  data,
  mode = "daily",
  onModeChange,
  ticks,
  sourceLabel,
  selectedPoint,
  onSelectPoint,
  vizMode = "fgpct",
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs text-slate-500">
        Not enough shot data yet to show a trend.
      </div>
    )
  }

  const isAttempts = vizMode === "attempts"
  const modeLabel =
    mode === "daily" ? "Daily" : mode === "weekly" ? "Weekly" : "Monthly"

  const handleCycle = (event) => {
    event?.stopPropagation?.()
    if (typeof onModeChange === "function") {
      const next =
        mode === "daily" ? "weekly" : mode === "weekly" ? "monthly" : "daily"
      onModeChange(next)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleCycle(event)
    }
  }

  const handleChartClick = (state) => {
    const payload = state?.activePayload?.[0]?.payload
    if (payload && typeof onSelectPoint === "function") {
      onSelectPoint(payload)
    }
  }

  const selectedText =
    selectedPoint && (selectedPoint.ts || selectedPoint.date || selectedPoint.label)
      ? `${sourceLabel || "Selected"} — ${formatSelectedDate(selectedPoint)}`
      : null

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-800">{title}</div>
        <div
          className="flex items-center gap-1 text-[11px] text-slate-500"
          role="button"
          tabIndex={0}
          onClick={handleCycle}
          onKeyDown={handleKeyDown}
        >
          <FilterIcon size={13} />
          <span>{modeLabel}</span>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 4, right: 10, left: -20, bottom: 0 }}
            onClick={handleChartClick}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              ticks={ticks}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            {isAttempts ? (
              <YAxis
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
            ) : (
              <YAxis
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
            )}
            <Tooltip
              formatter={(value) =>
                isAttempts ? `${value}` : `${Math.round(value)}%`
              }
              labelFormatter={(label) => label}
            />
            <Legend
              verticalAlign="bottom"
              height={24}
              wrapperStyle={{ fontSize: 10 }}
            />
            {isAttempts ? (
              <Line
                type="monotone"
                dataKey="fga"
                name="Attempts"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="efgPct"
                  name="eFG%"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="fgPct"
                  name="FG%"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {selectedText && (
        <div className="mt-2 text-[11px] text-slate-600">
          <span className="font-medium text-slate-800">Selected:</span>{" "}
          {selectedText}
        </div>
      )}
    </div>
  )
}
