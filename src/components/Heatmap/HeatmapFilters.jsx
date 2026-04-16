import { TIME_RANGES } from "../../constants/timeRange"

const MODE_OPTIONS = [
  { id: "attempts", label: "Attempt Density" },
  { id: "fgpct", label: "FG%" },
]

const SOURCE_OPTIONS = [
  { id: "game", label: "Game" },
  { id: "practice", label: "Practice" },
]

const SHOT_TYPE_OPTIONS = [
  { id: "Catch & Shoot", label: "Catch & Shoot" },
  { id: "Off-Dribble", label: "Off-Dribble" },
  { id: "Free Throw", label: "Free Throws" },
]

const CONTEST_FILTERS = [
  { id: "contested", label: "Contested" },
  { id: "uncontested", label: "Uncontested" },
]

function PillGroup({ options, value, onChange }) {
  return (
    <div className="time-pill-group">
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`time-pill${active ? " time-pill--active" : ""}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function TimeRangePills({ value, onChange }) {
  return (
    <div className="time-pill-group">
      {TIME_RANGES.map((range) => {
        const active = range.id === value
        return (
          <button
            key={range.id}
            type="button"
            onClick={() => onChange(range.id)}
            className={`time-pill${active ? " time-pill--active" : ""}`}
          >
            {range.label}
          </button>
        )
      })}
    </div>
  )
}

function ContestedPills({ value, onChange }) {
  const handleClick = (id) => {
    onChange(value === id ? "all" : id)
  }

  return (
    <div className="time-pill-group">
      {CONTEST_FILTERS.map((filter) => {
        const active = filter.id === value
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => handleClick(filter.id)}
            className={`time-pill${active ? " time-pill--active" : ""}`}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}

export default function HeatmapFilters({
  source,
  setSource,
  rangeId,
  setRangeId,
  mode,
  setMode,
  shotType,
  setShotType,
  contested,
  setContested,
}) {
  return (
    <>
      <section className="space-y-1">
        <span className="block text-xs font-semibold text-slate-700">
          Source
        </span>
        <PillGroup
          options={SOURCE_OPTIONS}
          value={source}
          onChange={setSource}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
        <div className="flex items-center justify-between">
          <TimeRangePills value={rangeId} onChange={setRangeId} />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <PillGroup options={MODE_OPTIONS} value={mode} onChange={setMode} />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <PillGroup
            options={SHOT_TYPE_OPTIONS}
            value={shotType}
            onChange={setShotType}
          />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <ContestedPills value={contested} onChange={setContested} />
        </div>
      </section>
    </>
  )
}
