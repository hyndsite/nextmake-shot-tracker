// src/lib/performance-db.js
//
// Helper to compute performance metrics from IndexedDB.
// Uses existing local data that your sync layer already populates:
// - game_sessions, game_events
// - practice_sessions, practice_entries

import dayjs from "dayjs"
import { get, keys } from "idb-keyval"
import { whenIdbReady } from "./idb-init"
import { st as gameSt } from "./game-db"
import { st as practiceSt } from "./practice-db"
import { ZONES } from "../constants/zones"

const ready = whenIdbReady()

// ---------- Zone label helper ----------

const zoneLabelMap = new Map()
if (Array.isArray(ZONES)) {
  ZONES.forEach((z) => {
    if (!z || !z.id) return
    zoneLabelMap.set(z.id, z.label || z.name || z.id)
  })
}

function labelForZone(zoneId) {
  if (!zoneId) return "Unknown"
  return zoneLabelMap.get(zoneId) || zoneId
}

// Map of three-point zones for eFG% in practice
const zoneIsThreeMap = new Map()
if (Array.isArray(ZONES)) {
  ZONES.forEach((z) => {
    if (!z || !z.id) return
    zoneIsThreeMap.set(z.id, !!z.isThree)
  })
}

// Set of zone ids that represent free throws (id or label-contains "free throw")
const ftZoneIds = new Set()
if (Array.isArray(ZONES)) {
  ZONES.forEach((z) => {
    if (!z || !z.id) return
    const labelLc = (z.label || z.name || "").toLowerCase()
    if (z.id === "free_throw" || labelLc.includes("free throw")) {
      ftZoneIds.add(z.id)
    }
  })
}

// ---------- Shot type filtering (Performance) ----------
// UI sends: "all" | "catch_shoot" | "off_dribble"
function normalizeShotTypeValue(v) {
  const s = String(v || "").trim().toLowerCase()
  if (!s) return ""
  // normalize common variants
  if (
    s === "catch_shoot" ||
    s === "catch&shoot" ||
    s === "catch & shoot" ||
    s === "catch and shoot" ||
    s === "catch-and-shoot"
  ) {
    return "catch_shoot"
  }
  if (
    s === "off_dribble" ||
    s === "off-dribble" ||
    s === "off dribble" ||
    s === "off the dribble" ||
    s === "off_the_dribble"
  ) {
    return "off_dribble"
  }
  return s
}

function normalizePerfShotTypeFilter(shotType) {
  const s = String(shotType || "all").trim().toLowerCase()
  if (s === "catch_shoot") return "catch_shoot"
  if (s === "off_dribble") return "off_dribble"
  return "all"
}

// NEW semantics: "all" means no filtering (include all shot types).
function includeShotType(eventShotType, filter) {
  if (filter === "all") return true
  const normalized = normalizeShotTypeValue(eventShotType)
  return normalized === filter
}

// ---------- Shared helpers ----------

// ---------- Contested filtering (Performance) ----------
// UI sends: "all" | "contested" | "uncontested"
function normalizePerfContestedFilter(v) {
  const s = String(v || "all").trim().toLowerCase()
  if (s === "contested") return "contested"
  if (s === "uncontested") return "uncontested"
  return "all"
}

function includeContested(contestedValue, filter) {
  if (filter === "all") return true
  const isContested = contestedValue === true // treat null/undefined as false
  if (filter === "contested") return isContested === true
  // "uncontested"
  return isContested === false
}


function pct(makes, attempts) {
  if (!attempts) return 0
  return (makes / attempts) * 100
}

function monthKeyFromTs(ts) {
  if (!ts) return null
  const d = dayjs(ts)
  if (!d.isValid()) return null
  return d.format("YYYY-MM") // e.g. "2025-02"
}

function monthLabel(key) {
  // key is "YYYY-MM"
  try {
    return dayjs(key + "-01").format("MMM")
  } catch {
    return key
  }
}

function withinRange(ts, fromDate) {
  if (!fromDate) return true
  const d = dayjs(ts)
  if (!d.isValid()) return false
  return d.isAfter(fromDate) || d.isSame(fromDate, "day")
}

// Normalize to a YYYY-MM-DD "day key"
function dayKeyFromTs(ts) {
  if (!ts) return null
  const d = dayjs(ts)
  if (!d.isValid()) return null
  return d.format("YYYY-MM-DD")
}

// Use the start-of-week date as a week key
function weekKeyFromTs(ts) {
  if (!ts) return null
  const d = dayjs(ts)
  if (!d.isValid()) return null
  return d.startOf("week").format("YYYY-MM-DD")
}

function weekLabelFromKey(key) {
  try {
    const d = dayjs(key)
    return d.isValid() ? d.format("MMM D") : key
  } catch {
    return key
  }
}

// ---------- GAME PERFORMANCE ----------

/**
 * Compute game performance from local IndexedDB.
 * @param {{ days: number | null, shotType?: "all" | "catch_shoot" | "off_dribble", athleteId?: string }} opts
 *  - days: number → filter to last N days, null → all time
 *  - shotType: optional shot type filter
 */
export async function getGamePerformance({ days, shotType, contested, athleteId }) {
  await ready

  const stFilter = normalizePerfShotTypeFilter(shotType)
  const cFilter = normalizePerfContestedFilter(contested)

  const fromDate =
    typeof days === "number"
      ? dayjs().subtract(days, "day").startOf("day")
      : null

  // 1) Determine which game sessions are in range & not deleted
  const sessionIds = new Set()
  const sessionsById = new Map()
  {
    const sessKeys = await keys(gameSt.game.sessions)
    for (const k of sessKeys) {
      const row = await get(k, gameSt.game.sessions)
      if (!row || row._deleted) continue
      if (athleteId && row.athlete_id !== athleteId) continue
      const okDate = fromDate
        ? withinRange(row.date_iso || row.started_at || row.ts, fromDate)
        : true
      if (!okDate) continue
      sessionIds.add(row.id)
      sessionsById.set(row.id, row)
    }
  }

  if (!sessionIds.size) {
    return {
      metrics: [],
      trend: [],
      overallFgPct: 0,
      overallEfgPct: 0,
      totalAttempts: 0,
      trendBuckets: {
        daily: [],
        weekly: [],
        monthly: [],
      },
    }
  }

  // 2) Walk all events in those sessions, in range
  const zoneAgg = new Map() // key → { label, makes, attempts }
  const trendAgg = new Map() // monthKey → { fgm, fga, threesMade } (monthly)
  const trendDailyAgg = new Map() // gameId → { gameId, dateKey, fgm, fga, threesMade }
  const trendWeeklyAgg = new Map() // weekKey → { fgm, fga, threesMade }
  let overallFgm = 0,
    overallFga = 0,
    overallThreesMade = 0

  const evKeys = await keys(gameSt.game.events)
  for (const k of evKeys) {
    const ev = await get(k, gameSt.game.events)
    if (!ev || ev._deleted) continue
    if (!sessionIds.has(ev.game_id)) continue
    if (athleteId && ev.athlete_id && ev.athlete_id !== athleteId) continue
    if (fromDate && !withinRange(ev.ts, fromDate)) continue

    // Per-zone cards (include both shots + free throws)
    if (ev.type === "shot") {
      // Contested filter (required: all shots fall into one of the two buckets)
      if (!includeContested(ev.contested, cFilter)) continue

      // Shot type filter (missing shot_type will be excluded for specific filters)
      if (!includeShotType(ev.shot_type, stFilter)) continue

      const zoneKey = ev.zone_id || "unknown_zone"
      const label = labelForZone(ev.zone_id)

      let rec = zoneAgg.get(zoneKey)
      if (!rec) {
        rec = { id: zoneKey, label, makes: 0, attempts: 0 }
        zoneAgg.set(zoneKey, rec)
      }
      rec.attempts += 1
      if (ev.made) rec.makes += 1

      // Trend + overall use only field goals (no free throws)
      overallFga += 1
      if (ev.made) {
        overallFgm += 1
        if (ev.is_three) overallThreesMade += 1
      }

      // Monthly trend
      const mk = monthKeyFromTs(ev.ts)
      if (mk) {
        let t = trendAgg.get(mk)
        if (!t) {
          t = { fgm: 0, fga: 0, threesMade: 0 }
          trendAgg.set(mk, t)
        }
        t.fga += 1
        if (ev.made) {
          t.fgm += 1
          if (ev.is_three) t.threesMade += 1
        }
      }

      // Daily trend (per game within range)
      const sess = sessionsById.get(ev.game_id)
      const baseTs = sess?.date_iso || sess?.started_at || ev.ts
      const dayKey = dayKeyFromTs(baseTs)
      if (dayKey) {
        let d = trendDailyAgg.get(ev.game_id)
        if (!d) {
          d = {
            gameId: ev.game_id,
            dateKey: dayKey,
            fgm: 0,
            fga: 0,
            threesMade: 0,
          }
          trendDailyAgg.set(ev.game_id, d)
        }
        d.fga += 1
        if (ev.made) {
          d.fgm += 1
          if (ev.is_three) d.threesMade += 1
        }
      }

      // Weekly trend (aggregate all games in the same week)
      const weekKey = weekKeyFromTs(
        sessionsById.get(ev.game_id)?.date_iso ||
          sessionsById.get(ev.game_id)?.started_at ||
          ev.ts,
      )
      if (weekKey) {
        let w = trendWeeklyAgg.get(weekKey)
        if (!w) {
          w = { fgm: 0, fga: 0, threesMade: 0 }
          trendWeeklyAgg.set(weekKey, w)
        }
        w.fga += 1
        if (ev.made) {
          w.fgm += 1
          if (ev.is_three) w.threesMade += 1
        }
      }
    } else if (ev.type === "freethrow") {
      // Preserve existing behavior: FT card only when ALL shot types
      if (stFilter !== "all") continue

      // Apply contested filter as well (typically FTs are uncontested)
      if (!includeContested(ev.contested, cFilter)) continue

      // Group all FTs into a single card "Free Throw"
      const zoneKey = "free_throw"
      const label = "Free Throw"
      let rec = zoneAgg.get(zoneKey)
      if (!rec) {
        rec = { id: zoneKey, label, makes: 0, attempts: 0 }
        zoneAgg.set(zoneKey, rec)
      }
      rec.attempts += 1
      if (ev.made) rec.makes += 1
    }
  }

  // 3) Build metric cards
  const metrics = Array.from(zoneAgg.values())
    .filter((m) => m.attempts > 0)
    .map((m) => ({
      ...m,
      fgPct: pct(m.makes, m.attempts),
      attemptsLabel: `${m.makes}/${m.attempts} Attempts`,
      // Placeholder: hook in goals later if/when we map them per zone
      goalPct: null,
    }))
    .sort((a, b) => b.attempts - a.attempts)

  // 4a) Monthly trend (FG% vs eFG%) – matches existing shape
  const trendMonthly = Array.from(trendAgg.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, v]) => {
      const fgPctVal = pct(v.fgm, v.fga)
      const efgPctVal = v.fga
        ? ((v.fgm + 0.5 * v.threesMade) / v.fga) * 100
        : 0
      return {
        monthKey: key,
        monthLabel: monthLabel(key),
        label: monthLabel(key),
        fgPct: fgPctVal,
        efgPct: efgPctVal,
        fga: v.fga,
      }
    })

  // 4b) Daily trend: one point per game in range
  const trendDaily = Array.from(trendDailyAgg.values())
    .sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1))
    .map((g) => {
      const fgPctVal = pct(g.fgm, g.fga)
      const efgPctVal = g.fga
        ? ((g.fgm + 0.5 * g.threesMade) / g.fga) * 100
        : 0
      return {
        bucketKey: g.gameId,
        label: dayjs(g.dateKey).format("MMM D"),
        fgPct: fgPctVal,
        efgPct: efgPctVal,
        fga: g.fga,
      }
    })

  // 4c) Weekly trend: one point per week
  const trendWeekly = Array.from(trendWeeklyAgg.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, v]) => {
      const fgPctVal = pct(v.fgm, v.fga)
      const efgPctVal = v.fga
        ? ((v.fgm + 0.5 * v.threesMade) / v.fga) * 100
        : 0
      return {
        weekKey: key,
        label: weekLabelFromKey(key),
        fgPct: fgPctVal,
        efgPct: efgPctVal,
        fga: v.fga,
      }
    })

  // 5) Overall FG% / eFG%
  const overallFgPct = pct(overallFgm, overallFga)
  const overallEfgPct = overallFga
    ? ((overallFgm + 0.5 * overallThreesMade) / overallFga) * 100
    : 0

  return {
    metrics,
    trend: trendMonthly,
    overallFgPct,
    overallEfgPct,
    totalAttempts: overallFga,
    trendBuckets: {
      daily: trendDaily,
      weekly: trendWeekly,
      monthly: trendMonthly,
    },
  }
}


// ---------- PRACTICE PERFORMANCE ----------

/**
 * Compute practice performance from local IndexedDB.
 * @param {{ days: number | null, shotType?: "all" | "catch_shoot" | "off_dribble", athleteId?: string }} opts
 */
export async function getPracticePerformance({ days, shotType, contested, athleteId }) {
  await ready

  const stFilter = normalizePerfShotTypeFilter(shotType)
  const cFilter = normalizePerfContestedFilter(contested)

  const fromDate =
    typeof days === "number"
      ? dayjs().subtract(days, "day").startOf("day")
      : null

  // 1) Determine which practice sessions are in range & not deleted
  const sessionIds = new Set()
  const sessionsById = new Map()
  {
    const sessKeys = await keys(practiceSt.practice.sessions)
    for (const k of sessKeys) {
      const row = await get(k, practiceSt.practice.sessions)
      if (!row || row._deleted) continue
      if (athleteId && row.athlete_id !== athleteId) continue
      const okDate = fromDate
        ? withinRange(row.date_iso || row.started_at || row.ts, fromDate)
        : true
      if (!okDate) continue
      sessionIds.add(row.id)
      sessionsById.set(row.id, row)
    }
  }

  if (!sessionIds.size) {
    return {
      metrics: [],
      trend: [],
      overallFgPct: 0,
      overallEfgPct: 0,
      totalAttempts: 0,
      trendBuckets: {
        daily: [],
        weekly: [],
        monthly: [],
      },
    }
  }

  // 2) Walk all practice entries that belong to those sessions
  const zoneAgg = new Map() // key → { label, makes, attempts }
  const trendAgg = new Map() // monthKey → { fgm, fga, threesMade }
  const trendDailyAgg = new Map() // sessionId → { sessionId, dateKey, fgm, fga, threesMade }
  const trendWeeklyAgg = new Map() // weekKey → { fgm, fga, threesMade }
  let overallFgm = 0,
    overallFga = 0,
    overallThreesMade = 0

  const entryKeys = await keys(practiceSt.practice.entries)
  for (const k of entryKeys) {
    const row = await get(k, practiceSt.practice.entries)
    if (!row || row._deleted) continue
    if (!sessionIds.has(row.session_id)) continue
    if (athleteId && row.athlete_id && row.athlete_id !== athleteId) continue
    if (fromDate && !withinRange(row.ts, fromDate)) continue

    const attempts =
      typeof row.attempts === "number"
        ? row.attempts
        : row.attempts
        ? Number(row.attempts)
        : 1

    const makes =
      typeof row.makes === "number"
        ? row.makes
        : row.made
        ? attempts
        : 0

    if (!attempts) continue

    const zoneId = row.zone_id || "practice_unknown"
    const label = labelForZone(zoneId) || row.drill_label || "Practice"

    // --- Free throw detection (practice) ---
    const typeLower = String(row.type || "").toLowerCase()
    const shotTypeLower = String(row.shot_type || "").toLowerCase()
    const isFt =
      ftZoneIds.has(zoneId) ||
      (shotTypeLower && shotTypeLower.includes("free throw")) ||
      typeLower === "freethrow"

    // ------------------------------------------------------------------
    // IMPORTANT: Apply filtering BEFORE per-zone aggregation (zoneAgg),
    // so the zone cards/drilldown match the filters.
    // ------------------------------------------------------------------

    // Free throws:
    // - never count toward FG/eFG/trends
    // - only show them (as their own card) when shotType filter is ALL
    // - contested filter also applies (typically FTs are uncontested)
    if (isFt) {
      if (stFilter !== "all") continue
      if (!includeContested(row.contested, cFilter)) continue

      const zoneKey = "free_throw"
      const zoneLabel = "Free Throw"

      let rec = zoneAgg.get(zoneKey)
      if (!rec) {
        rec = { id: zoneKey, label: zoneLabel, makes: 0, attempts: 0 }
        zoneAgg.set(zoneKey, rec)
      }
      rec.attempts += attempts
      rec.makes += makes

      // Do not include FTs in overall/trend FG calculations
      continue
    }

    // Non-FT: contested filter first
    if (!includeContested(row.contested, cFilter)) continue

    // Then shot type filter
    if (!includeShotType(row.shot_type, stFilter)) continue

    // Per-zone aggregation (field goals only, filtered)
    {
      const zoneKey = zoneId
      const zoneLabel = label

      let rec = zoneAgg.get(zoneKey)
      if (!rec) {
        rec = { id: zoneKey, label: zoneLabel, makes: 0, attempts: 0 }
        zoneAgg.set(zoneKey, rec)
      }
      rec.attempts += attempts
      rec.makes += makes
    }

    // Global FG / eFG and trend (field goals only, filtered)
    overallFga += attempts
    overallFgm += makes

    const isThree = zoneIsThreeMap.get(zoneId) || false
    if (isThree) overallThreesMade += makes

    // Monthly trend
    const mk = monthKeyFromTs(row.ts)
    if (mk) {
      let t = trendAgg.get(mk)
      if (!t) {
        t = { fgm: 0, fga: 0, threesMade: 0 }
        trendAgg.set(mk, t)
      }
      t.fga += attempts
      t.fgm += makes
      if (isThree) t.threesMade += makes
    }

    // Daily trend (per practice session)
    const sess = sessionsById.get(row.session_id)
    const baseTs = sess?.date_iso || sess?.started_at || row.ts
    const dayKey = dayKeyFromTs(baseTs)
    if (dayKey) {
      let d = trendDailyAgg.get(row.session_id)
      if (!d) {
        d = {
          sessionId: row.session_id,
          dateKey: dayKey,
          fgm: 0,
          fga: 0,
          threesMade: 0,
        }
        trendDailyAgg.set(row.session_id, d)
      }
      d.fga += attempts
      d.fgm += makes
      if (isThree) d.threesMade += makes
    }

    // Weekly trend (aggregate all practice in the same week)
    const weekKey = weekKeyFromTs(
      sessionsById.get(row.session_id)?.date_iso ||
        sessionsById.get(row.session_id)?.started_at ||
        row.ts,
    )
    if (weekKey) {
      let w = trendWeeklyAgg.get(weekKey)
      if (!w) {
        w = { fgm: 0, fga: 0, threesMade: 0 }
        trendWeeklyAgg.set(weekKey, w)
      }
      w.fga += attempts
      w.fgm += makes
      if (isThree) w.threesMade += makes
    }
  }

  // 3) Build metric cards
  const metrics = Array.from(zoneAgg.values())
    .filter((m) => m.attempts > 0)
    .map((m) => ({
      ...m,
      fgPct: pct(m.makes, m.attempts),
      attemptsLabel: `${m.makes}/${m.attempts} Attempts`,
      goalPct: null,
    }))
    .sort((a, b) => b.attempts - a.attempts)

  // 4a) Monthly trend
  const trendMonthly = Array.from(trendAgg.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, v]) => {
      const fgPctVal = pct(v.fgm, v.fga)
      const efgPctVal = v.fga
        ? ((v.fgm + 0.5 * v.threesMade) / v.fga) * 100
        : 0
      return {
        monthKey: key,
        monthLabel: monthLabel(key),
        label: monthLabel(key),
        fgPct: fgPctVal,
        efgPct: efgPctVal,
        fga: v.fga,
      }
    })

  // 4b) Daily trend
  const trendDaily = Array.from(trendDailyAgg.values())
    .sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1))
    .map((s) => {
      const fgPctVal = pct(s.fgm, s.fga)
      const efgPctVal = s.fga
        ? ((s.fgm + 0.5 * s.threesMade) / s.fga) * 100
        : 0
      return {
        bucketKey: s.sessionId,
        label: dayjs(s.dateKey).format("MMM D"),
        fgPct: fgPctVal,
        efgPct: efgPctVal,
        fga: s.fga,
      }
    })

  // 4c) Weekly trend
  const trendWeekly = Array.from(trendWeeklyAgg.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, v]) => {
      const fgPctVal = pct(v.fgm, v.fga)
      const efgPctVal = v.fga
        ? ((v.fgm + 0.5 * v.threesMade) / v.fga) * 100
        : 0
      return {
        weekKey: key,
        label: weekLabelFromKey(key),
        fgPct: fgPctVal,
        efgPct: efgPctVal,
        fga: v.fga,
      }
    })

  // 5) Overall FG% / eFG%
  const overallFgPct = pct(overallFgm, overallFga)
  const overallEfgPct = overallFga
    ? ((overallFgm + 0.5 * overallThreesMade) / overallFga) * 100
    : 0

  return {
    metrics,
    trend: trendMonthly,
    overallFgPct,
    overallEfgPct,
    totalAttempts: overallFga,
    trendBuckets: {
      daily: trendDaily,
      weekly: trendWeekly,
      monthly: trendMonthly,
    },
  }
}
