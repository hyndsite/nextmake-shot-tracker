import HeatmapZoneChip from "./HeatmapZoneChip"

export default function HeatmapCourt({
  loading,
  totalAttempts,
  zones,
  mode,
  anchorMap,
  onImageLoad,
  onZoneClick,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-800">Court View</div>
        <div className="text-[11px] text-slate-500">
          {loading
            ? "Loading…"
            : totalAttempts
              ? `${totalAttempts} attempts`
              : "No attempts in this range"}
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <img
          src="/court-half.svg"
          alt="Half court"
          className="pointer-events-none block h-auto w-full select-none"
          onLoad={onImageLoad}
        />

        {zones.map((zone) => (
          <HeatmapZoneChip
            key={zone.id}
            zone={zone}
            mode={mode}
            anchor={anchorMap.get(zone.id)}
            onClick={onZoneClick}
          />
        ))}
      </div>
    </section>
  )
}
