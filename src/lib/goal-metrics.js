// src/lib/goal-metrics.js
// Central place for defining goal metric options + how to compute them
// from raw game events and practice entries.

import { ZONES } from "../constants/zones"

// ------------ Metric option lists (re-export for UI use) --------------

export const BASE_METRIC_OPTIONS = [
  { value: "efg_overall", label: "eFG% (overall)" },
  { value: "three_pct_overall", label: "3P% (overall)" },
  { value: "ft_pct", label: "FT%" },
  { value: "fg_pct_zone", label: "FG% (by zone)" },
  { value: "off_dribble_fg", label: "Off-Dribble FG%" },
  { value: "pressured_fg", label: "Pressured FG%" },
  { value: "makes", label: "Makes (count)" },
  { value: "attempts", label: "Attempts (count)" },
]

// Only for game goal sets (we track these only in games)
export const GAME_ONLY_METRIC_OPTIONS = [
  { value: "points_total", label: "Total Points (Game)" },
  { value: "steals_total", label: "Steals (Game)" },
  { value: "assists_total", label: "Assists (Game)" },
  { value: "rebounds_total", label: "Rebounds (Game)" },
]

// Convenience: which metrics are inherently percentages vs counts
const PERCENT_METRICS = new Set([
  "efg_overall",
  "three_pct_overall",
  "ft_pct",
  "fg_pct_zone",
  "off_dribble_fg",
  "pressured_fg",
])

const COUNT_METRICS = new Set([
  "makes",
  "attempts",
  "points_total",
  "steals_total",
  "assists_total",
  "rebounds_total",
])

export function metricIsPercent(metricKey) {
  return PERCENT_METRICS.has(metricKey)
}

export function metricIsCount(metricKey) {
  return COUNT_METRICS.has(metricKey)
}

// ------------- Shared helpers: filtering & aggregation -----------------

function normalizeDate(d) {
  if (!d) return null
  if (d instanceof Date) return d
  // can be "2025-01-01", ISO string, or ms number
  if (typeof d === "number") return new Date(d)
  return new Date(String(d))
}

/**
 * Filter events by [startDate, endDate] (inclusive).
 * Dates can be Date, ISO string, or ms timestamps.
 */
export function filterEventsByDate(events, { startDate, endDate } = {}) {
  if (!startDate && !endDate) return Array.isArray(events) ? events.slice() : []

  const start = normalizeDate(startDate)
  const end = normalizeDate(endDate)

  return (events || []).filter((e) => {
    const ts = e?.ts
    if (!ts) return false
    const t = normalizeDate(ts)
    if (!t) return false
    if (start && t < start) return false
    if (end && t > end) return false
    return true
  })
}

// Map of three-point zones for eFG / 3P calc
const ZONE_IS_THREE = new Map()
// Set of zone ids that represent free throws (by id or label)
const FREE_THROW_ZONE_IDS = new Set()

for (const z of ZONES || []) {
  if (!z || !z.id) continue
  ZONE_IS_THREE.set(z.id, !!z.isThree)

  const labelLc = (z.label || z.name || "").toLowerCase()
  if (z.id === "free_throw" || labelLc.includes("free throw")) {
    FREE_THROW_ZONE_IDS.add(z.id)
  }
}

// ----------------- Game aggregation & metrics --------------------------

/**
 * Aggregate core stats from a set of game events.
 * This mirrors the logic already used in GameLogger stats.
 */
export function aggregateGameEvents(events) {
  let assists = 0
  let rebounds = 0
  let steals = 0

  let ftMakes = 0
  let ftAtt = 0

  let fgm = 0
  let fga = 0
  let threesMade = 0
  let threesAtt = 0

  let totalPoints = 0

  // Extra buckets for more specific metrics
  let zoneFgm = new Map() // zoneId -> makes
  let zoneFga = new Map() // zoneId -> attempts

  let offDribbleMakes = 0
  let offDribbleAtt = 0

  let pressuredMakes = 0
  let pressuredAtt = 0

  for (const e of events || []) {
    switch (e.type) {
      case "assist":
        assists++
        break
      case "rebound":
        rebounds++
        break
      case "steal":
        steals++
        break
      case "freethrow": {
        ftAtt++
        if (e.made) {
          ftMakes++
          totalPoints += 1
        }
        break
      }
      case "shot": {
        fga++
        const isThree = !!e.is_three
        const made = !!e.made

        if (isThree) threesAtt++
        if (made) {
          fgm++
          if (isThree) threesMade++
          totalPoints += isThree ? 3 : 2
        }

        // Zone FG%
        const z = e.zone_id || "unknown"
        zoneFga.set(z, (zoneFga.get(z) || 0) + 1)
        if (made) {
          zoneFgm.set(z, (zoneFgm.get(z) || 0) + 1)
        }

        // Off-dribble is inferred from shot_type text
        const shotType = (e.shot_type || e.shotType || "").toLowerCase()
        const isOffDribble =
          shotType.includes("dribble") || shotType.includes("pull-up")

        if (isOffDribble) {
          offDribbleAtt++
          if (made) offDribbleMakes++
        }

        // Pressured shots (requires e.pressured to be stored)
        if (e.pressured) {
          pressuredAtt++
          if (made) pressuredMakes++
        }

        break
      }
      default:
        break
    }
  }

  const fgPct = fga ? (fgm / fga) * 100 : 0
  const efgPct = fga ? ((fgm + 0.5 * threesMade) / fga) * 100 : 0
  const threePct = threesAtt ? (threesMade / threesAtt) * 100 : 0
  const ftPct = ftAtt ? (ftMakes / ftAtt) * 100 : 0

  return {
    assists,
    rebounds,
    steals,
    ftMakes,
    ftAtt,
    ftPct,
    fgm,
    fga,
    fgPct,
    efgPct,
    threesMade,
    threesAtt,
    threePct,
    totalPoints,

    zoneFgm,
    zoneFga,

    offDribbleMakes,
    offDribbleAtt,
    pressuredMakes,
    pressuredAtt,
  }
}

/**
 * Compute the *raw numeric value* for a given metric from game events.
 *
 * `options`:
 *   - startDate / endDate: optional date range
 *   - zoneId: for FG% by zone goal (if omitted, returns overall FG%)
 */
export function computeGameMetricValue(
  metricKey,
  events,
  { startDate, endDate, zoneId } = {},
) {
  const filtered = filterEventsByDate(events, { startDate, endDate })
  const stats = aggregateGameEvents(filtered)

  switch (metricKey) {
    case "efg_overall":
      return stats.efgPct || 0

    case "three_pct_overall":
      return stats.threePct || 0

    case "ft_pct":
      return stats.ftPct || 0

    case "fg_pct_zone": {
      // If a specific zone is provided, use that; otherwise overall FG%
      if (!zoneId) {
        return stats.fgPct || 0
      }
      const makes = stats.zoneFgm.get(zoneId) || 0
      const att = stats.zoneFga.get(zoneId) || 0
      return att ? (makes / att) * 100 : 0
    }

    case "off_dribble_fg": {
      const { offDribbleMakes, offDribbleAtt } = stats
      return offDribbleAtt ? (offDribbleMakes / offDribbleAtt) * 100 : 0
    }

    case "pressured_fg": {
      const { pressuredMakes, pressuredAtt } = stats
      return pressuredAtt ? (pressuredMakes / pressuredAtt) * 100 : 0
    }

    case "makes": {
      // total made shots + made FTs
      return stats.fgm + stats.ftMakes
    }

    case "attempts": {
      // total shot + FT attempts
      return stats.fga + stats.ftAtt
    }

    // ---- game-only count metrics ----

    case "points_total":
      return stats.totalPoints

    case "steals_total":
      return stats.steals

    case "assists_total":
      return stats.assists

    case "rebounds_total":
      return stats.rebounds

    default:
      // Unknown metric → 0 so we fail safely
      return 0
  }
}

/**
 * Convenience: compute a "display" string for a metric.
 * Percent metrics come back as "xx.x%", count metrics as plain numbers.
 */
export function formatMetricValue(metricKey, rawValue) {
  if (rawValue == null || Number.isNaN(rawValue)) return "0"

  if (metricIsPercent(metricKey)) {
    // round to one decimal for display
    const v = Math.round(rawValue * 10) / 10
    return `${v}%`
  }

  return String(Math.round(rawValue))
}

// ------------- Practice aggregation & metrics --------------------------

/**
 * Practice entries are aggregated rows:
 *   - attempts: number of shots
 *   - makes: number of makes
 *   - zone_id
 *   - shot_type (e.g. "Catch & Shoot", "Off-Dribble", "Free Throw")
 *   - pressured: boolean
 *   - ts: timestamp
 *
 * We mirror the game aggregation logic, but work with attempts/makes instead
 * of per-shot events.
 */
function aggregatePracticeEntries(entries) {
  let ftMakes = 0
  let ftAtt = 0

  let fgm = 0
  let fga = 0
  let threesMade = 0
  let threesAtt = 0

  let zoneFgm = new Map()
  let zoneFga = new Map()

  let offDribbleMakes = 0
  let offDribbleAtt = 0

  let pressuredMakes = 0
  let pressuredAtt = 0

  for (const e of entries || []) {
    const attempts =
      typeof e.attempts === "number"
        ? e.attempts
        : e.attempts
        ? Number(e.attempts)
        : 1

    const makes =
      typeof e.makes === "number"
        ? e.makes
        : e.made
        ? attempts
        : 0

    if (!attempts) continue

    const zoneId = e.zone_id || "unknown"
    const shotType = (e.shot_type || e.shotType || "").toLowerCase()
    const typeLower = String(e.type || "").toLowerCase()

    // 🚩 Unified FT detection for practice:
    // - Zone id is one of the FT zones ("free_throw" or label contains "free throw")
    // - OR shot_type mentions "free throw" / is "ft"
    // - OR type is "freethrow" (if we ever add type column for practice)
    const isFt =
      FREE_THROW_ZONE_IDS.has(zoneId) ||
      (shotType && shotType.includes("free throw")) ||
      shotType === "ft" ||
      typeLower === "freethrow"

    if (isFt) {
      // Free throws are separate from FG attempts for eFG, same as games
      ftAtt += attempts
      ftMakes += makes
      continue
    }

    // Field goals
    fga += attempts
    fgm += makes

    const isThree = ZONE_IS_THREE.get(zoneId) || !!e.is_three

    if (isThree) {
      threesAtt += attempts
      threesMade += makes
    }

    zoneFga.set(zoneId, (zoneFga.get(zoneId) || 0) + attempts)
    zoneFgm.set(zoneId, (zoneFgm.get(zoneId) || 0) + makes)

    const isOffDribble =
      shotType.includes("dribble") || shotType.includes("pull-up")
    if (isOffDribble) {
      offDribbleAtt += attempts
      offDribbleMakes += makes
    }

    if (e.pressured) {
      pressuredAtt += attempts
      pressuredMakes += makes
    }
  }

  const fgPct = fga ? (fgm / fga) * 100 : 0
  const efgPct = fga ? ((fgm + 0.5 * threesMade) / fga) * 100 : 0
  const threePct = threesAtt ? (threesMade / threesAtt) * 100 : 0
  const ftPct = ftAtt ? (ftMakes / ftAtt) * 100 : 0

  return {
    ftMakes,
    ftAtt,
    ftPct,
    fgm,
    fga,
    fgPct,
    efgPct,
    threesMade,
    threesAtt,
    threePct,
    zoneFgm,
    zoneFga,
    offDribbleMakes,
    offDribbleAtt,
    pressuredMakes,
    pressuredAtt,
  }
}

/**
 * Compute practice metric value from practice_entries.
 *
 * We only expect BASE_METRIC_OPTIONS on practice sets (GoalsManager enforces
 * that), so we focus on those keys. Any game-only metrics return 0.
 *
 * Importantly: the formulas for FG%, eFG%, 3P%, FT%, zone FG, off-dribble FG,
 * pressured FG, makes, and attempts are now the SAME as for games — the only
 * difference is which dataset (practice vs game) we aggregate.
 */
export function computePracticeMetricValue(
  metricKey,
  entries,
  { startDate, endDate, zoneId } = {},
) {
  const filtered = filterEventsByDate(entries, { startDate, endDate })
  const stats = aggregatePracticeEntries(filtered)

  switch (metricKey) {
    case "efg_overall":
      return stats.efgPct || 0

    case "three_pct_overall":
      return stats.threePct || 0

    case "ft_pct":
      return stats.ftPct || 0

    case "fg_pct_zone": {
      if (!zoneId) {
        return stats.fgPct || 0
      }
      const makes = stats.zoneFgm.get(zoneId) || 0
      const att = stats.zoneFga.get(zoneId) || 0
      return att ? (makes / att) * 100 : 0
    }

    case "off_dribble_fg": {
      const { offDribbleMakes, offDribbleAtt } = stats
      return offDribbleAtt ? (offDribbleMakes / offDribbleAtt) * 100 : 0
    }

    case "pressured_fg": {
      const { pressuredMakes, pressuredAtt } = stats
      return pressuredAtt ? (pressuredMakes / pressuredAtt) * 100 : 0
    }

    case "makes": {
      // total made field goals + made FTs
      return stats.fgm + stats.ftMakes
    }

    case "attempts": {
      // total attempts (FG + FT)
      return stats.fga + stats.ftAtt
    }

    // Game-only metrics don't apply to practice; return 0 safely
    case "points_total":
    case "steals_total":
    case "assists_total":
    case "rebounds_total":
      return 0

    default:
      return 0
  }
}
