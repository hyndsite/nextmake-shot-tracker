import PerformanceMetricCard from "./PerformanceMetricCard"
import PerformanceSectionHeader from "./PerformanceSectionHeader"
import PerformanceTrendChart from "./PerformanceTrendChart"

export default function PerformanceSection({
  title,
  expanded,
  onToggle,
  modeValue,
  onModeChange,
  totalAttemptsText,
  rangeValue,
  onRangeChange,
  shotTypeValue,
  onShotTypeChange,
  contestedValue,
  onContestedChange,
  loading,
  emptyText,
  metrics,
  trendTitle,
  trendData,
  trendMode,
  onTrendModeChange,
  trendTicks,
  sourceLabel,
  selectedPoint,
  onSelectPoint,
  vizMode,
  totalAttempts,
  ModePills,
  TimeRangePills,
  ShotTypePills,
  ContestedPills,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
      <PerformanceSectionHeader
        title={title}
        expanded={expanded}
        onToggle={onToggle}
      />

      {expanded && (
        <>
          <div className="flex items-center justify-between mt-1">
            <ModePills value={modeValue} onChange={onModeChange} />
            <div className="text-[11px] text-slate-500">{totalAttemptsText}</div>
          </div>

          <div className="flex items-center justify-between mt-1">
            <TimeRangePills value={rangeValue} onChange={onRangeChange} />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <ShotTypePills value={shotTypeValue} onChange={onShotTypeChange} />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <ContestedPills value={contestedValue} onChange={onContestedChange} />
          </div>

          <div className="mt-3 space-y-2">
            {loading && (
              <div className="text-xs text-slate-500">{`Loading ${title.toLowerCase()} performance…`}</div>
            )}
            {!loading && metrics.length === 0 && (
              <div className="text-xs text-slate-500">{emptyText}</div>
            )}
            {!loading &&
              metrics.map((metric) => (
                <PerformanceMetricCard
                  key={metric.id}
                  label={metric.label}
                  fgPct={metric.fgPct}
                  attempts={metric.attempts}
                  makes={metric.makes}
                  attemptsLabel={metric.attemptsLabel}
                  goalPct={metric.goalPct}
                  mode={vizMode}
                  totalAttempts={totalAttempts}
                />
              ))}
          </div>

          <div className="mt-4">
            <PerformanceTrendChart
              title={trendTitle}
              data={trendData}
              mode={trendMode}
              onModeChange={onTrendModeChange}
              ticks={trendTicks}
              sourceLabel={sourceLabel}
              selectedPoint={selectedPoint}
              onSelectPoint={onSelectPoint}
              vizMode={vizMode}
            />
          </div>
        </>
      )}
    </section>
  )
}
