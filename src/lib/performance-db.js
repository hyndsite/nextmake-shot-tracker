// src/lib/performance-db.js
//
// Helper to compute performance metrics from IndexedDB.
// NO new Supabase tables. Uses existing local data that your sync layer
// already populates: game_sessions, game_events, practice_entries.

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

// ---------- Shared helpers ----------

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

// ---------- GAME PERFORMANCE ----------

/**
 * Compute game performance from local IndexedDB.
 * @param {{ days: number | null }} opts
 *  - days: number → filter to last N days, null → all time
 */
export async function getGamePerformance({ days }) {
  await ready

  const fromDate =
    typeof days === "number"
      ? dayjs().subtract(days, "day").startOf("day")
      : null

  // 1) Determine which game sessions are in range & not deleted
  const sessionIds = new Set()
  {
    const sessKeys = await keys(gameSt.game.sessions)
    for (const k of sessKeys) {
      const row = await get(k, gameSt.game.sessions)
      if (!row || row._deleted) continue
      const okDate = fromDate
        ? withinRange(row.date_iso || row.started_at || row.ts, fromDate)
        : true
      if (!okDate) continue
      sessionIds.add(row.id)
    }
  }

  if (!sessionIds.size) {
    return {
      metrics: [],
      trend: [],
      overallFgPct: 0,
      overallEfgPct: 0,
      totalAttempts: 0,
    }
  }

  // 2) Walk all events in those sessions, in range
  const zoneAgg = new Map() // key → { label, makes, attempts }
  const trendAgg = new Map() // monthKey → { fgm, fga, threesMade }
  let overallFgm = 0,
    overallFga = 0,
    overallThreesMade = 0

  const evKeys = await keys(gameSt.game.events)
  for (const k of evKeys) {
    const ev = await get(k, gameSt.game.events)
    if (!ev || ev._deleted) continue
    if (!sessionIds.has(ev.game_id)) continue
    if (fromDate && !withinRange(ev.ts, fromDate)) continue

    // Per-zone cards (include both shots + free throws)
    if (ev.type === "shot") {
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
    } else if (ev.type === "freethrow") {
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
    // sort by attempts desc
    .sort((a, b) => b.attempts - a.attempts)

  // 4) Build monthly trend (FG% vs eFG%)
  const trend = Array.from(trendAgg.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, v]) => {
      const fgPctVal = pct(v.fgm, v.fga)
      const efgPctVal = v.fga
        ? ((v.fgm + 0.5 * v.threesMade) / v.fga) * 100
        : 0
      return {
        monthKey: key,
        monthLabel: monthLabel(key),
        fgPct: fgPctVal,
        efgPct: efgPctVal,
      }
    })

  const overallFgPct = pct(overallFgm, overallFga)
  const overallEfgPct = overallFga
    ? ((overallFgm + 0.5 * overallThreesMade) / overallFga) * 100
    : 0

  return {
    metrics,
    trend,
    overallFgPct,
    overallEfgPct,
    totalAttempts: overallFga,
  }
}

// ---------- PRACTICE PERFORMANCE ----------

/**
 * Compute practice performance from local IndexedDB (practice_sessions + practice_entries).
 *
 * We mirror the same pattern as game:
 *  - Filter sessions by date range (days back from today)
 *  - Consider only entries that belong to in-range sessions
 *  - Aggregate attempts/makes per zone
 *  - Build FG% / eFG% trend over time
 */
export async function getPracticePerformance({ days }) {
  await ready

  const fromDate =
    typeof days === "number"
      ? dayjs().subtract(days, "day").startOf("day")
      : null

  // 1) Determine which practice sessions are in range & not deleted
  const sessionIds = new Set()
  {
    const sessKeys = await keys(practiceSt.practice.sessions)
    for (const k of sessKeys) {
      const row = await get(k, practiceSt.practice.sessions)
      if (!row || row._deleted) continue
      const okDate = fromDate
        ? withinRange(row.date_iso || row.started_at || row.ts, fromDate)
        : true
      if (!okDate) continue
      sessionIds.add(row.id)
    }
  }

  if (!sessionIds.size) {
    return {
      metrics: [],
      trend: [],
      overallFgPct: 0,
      overallEfgPct: 0,
      totalAttempts: 0,
    }
  }

  // 2) Walk all practice entries that belong to those sessions
  const zoneAgg = new Map() // key → { label, makes, attempts }
  const trendAgg = new Map() // monthKey → { fgm, fga, threesMade }
  let overallFgm = 0,
    overallFga = 0,
    overallThreesMade = 0

  const entryKeys = await keys(practiceSt.practice.entries)
  for (const k of entryKeys) {
    const row = await get(k, practiceSt.practice.entries)
    if (!row || row._deleted) continue
    if (!sessionIds.has(row.session_id)) continue
    if (fromDate && !withinRange(row.ts, fromDate)) continue

    const zoneKey = row.zone_id || "practice_unknown"
    const label =
      labelForZone(row.zone_id) || row.drill_label || "Practice"

    // Attempt/make counts: practice_entries are aggregated
    // attempts / makes rows, but we stay defensive.
    let attempts = 0
    let makes = 0

    if (typeof row.attempts === "number") {
      attempts = row.attempts
      if (typeof row.makes === "number") {
        makes = row.makes
      } else if (typeof row.made === "boolean") {
        makes = row.made ? attempts : 0
      }
    } else {
      // Fallback: assume one attempt per entry
      attempts = 1
      makes = row.made ? 1 : 0
    }

    if (!attempts) continue

    // Per-zone agg for metric cards
    let rec = zoneAgg.get(zoneKey)
    if (!rec) {
      rec = { id: zoneKey, label, makes: 0, attempts: 0 }
      zoneAgg.set(zoneKey, rec)
    }
    rec.attempts += attempts
    rec.makes += makes

    // Global FG / eFG and trend
    overallFga += attempts
    overallFgm += makes

    const isThree = zoneIsThreeMap.get(row.zone_id) || false
    if (isThree) overallThreesMade += makes

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
  }

  if (!overallFga) {
    return {
      metrics: [],
      trend: [],
      overallFgPct: 0,
      overallEfgPct: 0,
      totalAttempts: 0,
    }
  }

  const metrics = Array.from(zoneAgg.values())
    .filter((m) => m.attempts > 0)
    .map((m) => ({
      ...m,
      fgPct: pct(m.makes, m.attempts),
      attemptsLabel: `${m.makes}/${m.attempts} Attempts`,
      goalPct: null, // hook to goals later if needed
    }))
    .sort((a, b) => b.attempts - a.attempts)

  const trend = Array.from(trendAgg.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, v]) => {
      const fgPctVal = pct(v.fgm, v.fga)
      const efgPctVal = v.fga
        ? ((v.fgm + 0.5 * v.threesMade) / v.fga) * 100
        : 0
      return {
        monthKey: key,
        monthLabel: monthLabel(key),
        fgPct: fgPctVal,
        efgPct: efgPctVal,
      }
    })

  const overallFgPct = pct(overallFgm, overallFga)
  const overallEfgPct = overallFga
    ? ((overallFgm + 0.5 * overallThreesMade) / overallFga) * 100
    : 0

  return {
    metrics,
    trend,
    overallFgPct,
    overallEfgPct,
    totalAttempts: overallFga,
  }
}
