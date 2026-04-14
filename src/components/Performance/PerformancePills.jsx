import { TIME_RANGES } from "../../constants/timeRange"

const SHOT_TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "catch_shoot", label: "Catch & Shoot" },
  { id: "off_dribble", label: "Off-dribble" },
]

const CONTEST_FILTERS = [
  { id: "contested", label: "Contested" },
  { id: "uncontested", label: "Uncontested" },
]

const MODE_OPTIONS = [
  { id: "attempts", label: "Attempts" },
  { id: "fgpct", label: "FG%" },
]

export function PerformanceContestedPills({ value, onChange }) {
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

export function PerformanceModePills({ value, onChange }) {
  return (
    <div className="time-pill-group">
      {MODE_OPTIONS.map((option) => {
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

export function PerformanceTimeRangePills({ value, onChange }) {
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

export function PerformanceShotTypePills({ value, onChange }) {
  return (
    <div className="time-pill-group">
      {SHOT_TYPE_FILTERS.map((filter) => {
        const active = filter.id === value
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onChange(filter.id)}
            className={`time-pill${active ? " time-pill--active" : ""}`}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}
