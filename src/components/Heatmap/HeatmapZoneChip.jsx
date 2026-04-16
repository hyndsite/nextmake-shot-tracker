import { zoneDisplayValue } from "../../hooks/useHeatmapData"

export default function HeatmapZoneChip({ zone, mode, anchor, onClick }) {
  const { label: valueLabel, metric } = zoneDisplayValue(zone, mode)
  if (!anchor) return null

  let backgroundColor = "rgba(15,23,42,0.85)"

  if (mode === "fgpct") {
    const ratio = Math.min(1, Math.max(0, metric / 100))
    const red = Math.round(220 - 120 * ratio)
    const green = Math.round(60 + 140 * ratio)
    backgroundColor = `rgba(${red},${green},60,0.9)`
  } else if (mode === "attempts") {
    const ratio = Math.min(1, Math.max(0, metric / 100))
    const alpha = 0.4 + 0.4 * ratio
    backgroundColor = `rgba(37,99,235,${alpha})`
  }

  return (
    <button
      type="button"
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 px-2.5 py-1 text-[9px] leading-tight text-slate-50 shadow-sm"
      style={{
        left: `${anchor.leftPct}%`,
        top: `${anchor.topPct}%`,
        backgroundColor,
      }}
      onClick={() => onClick?.(zone)}
      aria-label={zone.label}
    >
      <div className="whitespace-nowrap font-semibold">{zone.label}</div>
      <div className="opacity-90">{valueLabel}</div>
    </button>
  )
}
