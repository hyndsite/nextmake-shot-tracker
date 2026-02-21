// src/lib/game-db.js
import { createStore, get, set, del, keys } from "idb-keyval"
import { uuid } from "./util-id"
import { notifyLocalMutate } from "./sync-notify"
import { whenIdbReady } from "./idb-init"
import { supabase } from "./supabase"
import { getActiveAthleteId } from "./athlete-db"

const ready = whenIdbReady()
const nowISO = () => new Date().toISOString()

export const st = {
  game: {
    sessions: createStore("game", "sessions"),
    events: createStore("game", "events"),
  },
}

function normalizeHomeAway(v) {
  if (v == null) return "Home"
  const s = String(v).trim().toLowerCase()
  if (s === "home" || s === "h") return "Home"
  if (s === "away" || s === "a") return "Away"
  return "Home"
}

function belongsToActiveAthlete(rowAthleteId) {
  const activeAthleteId = getActiveAthleteId()
  if (!activeAthleteId) return true
  // Legacy rows may not have athlete_id yet; keep visible until full backfill.
  if (!rowAthleteId) return true
  return rowAthleteId === activeAthleteId
}

/**
 * Recompute running totals for ALL non-deleted events in a game, in chronological order,
 * and persist totals on shot + freethrow events.
 *
 * This prevents stale totals when editing/deleting prior attempts.
 */
async function recomputeAndPersistScoringTotals(gameId) {
  await ready
  if (!gameId) return

  const evKeys = await keys(st.game.events)
  const evs = []
  for (const k of evKeys) {
    const ev = await get(k, st.game.events)
    if (!ev) continue
    if (ev._deleted) continue
    if (ev.game_id !== gameId) continue
    evs.push(ev)
  }

  evs.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())

  let two = 0
  let three = 0
  let ft = 0
  let totalPoints = 0

  for (const ev of evs) {
    // Only attach totals to shot / freethrow events (existing behavior)
    if (ev.type !== "shot" && ev.type !== "freethrow") continue

    if (ev.type === "shot" && ev.made) {
      if (ev.is_three) {
        three += 1
        totalPoints += 3
      } else {
        two += 1
        totalPoints += 2
      }
    } else if (ev.type === "freethrow" && ev.made) {
      ft += 1
      totalPoints += 1
    }

    const updated = {
      ...ev,
      total_2pt_made: two,
      total_3pt_made: three,
      total_ft_made: ft,
      total_points: totalPoints,
      _dirty: true, // totals changed => ensure sync
      _table: "game_events",
    }

    await set(updated.id, updated, st.game.events)
  }
}

/* -----------------------------
 * Sessions (local)
 * ---------------------------*/

export async function listGameSessions() {
  await ready
  const allKeys = await keys(st.game.sessions)
  const rows = []
  for (const k of allKeys) {
    const row = await get(k, st.game.sessions)
    if (row && !row._deleted && belongsToActiveAthlete(row.athlete_id)) rows.push(row)
  }
  rows.sort((a, b) => (b.started_at || "").localeCompare(a.started_at || ""))
  return rows
}

export async function getGameSession(id) {
  await ready
  if (!id) return null
  const row = await get(id, st.game.sessions)
  if (!row) return null
  if (!belongsToActiveAthlete(row.athlete_id)) return null
  return row
}

export async function getActiveGameSession() {
  await ready
  const all = await listGameSessions()
  return all.find((s) => s?.status === "active" && !s?.ended_at) || null
}

export async function addGameSession(meta = {}) {
  await ready
  const id = uuid()
  const startedAt = nowISO()

  const homeAwayInput = meta.home_away ?? meta.homeAway ?? meta.homeOrAway
  const athleteId = meta.athlete_id ?? meta.athleteId ?? getActiveAthleteId() ?? null

  const row = {
    id,
    athlete_id: athleteId,
    status: "active",
    started_at: startedAt,
    ended_at: null,

    date_iso: meta.date_iso ?? startedAt.slice(0, 10),
    team_name: meta.team_name ?? meta.teamName ?? "",
    opponent_name: meta.opponent_name ?? meta.opponentName ?? "",
    venue: meta.venue ?? null,
    level: meta.level ?? "High School",
    home_away: normalizeHomeAway(homeAwayInput),

    _dirty: true,
    _deleted: false,
    _table: "game_sessions",
  }

  await set(id, row, st.game.sessions)
  notifyLocalMutate()
  return row
}

export async function endGameSession(id, patch = {}) {
  await ready
  const row = await getGameSession(id)
  if (!row) return null

  const updated = {
    ...row,
    ...patch, // <-- allows team_score / opponent_score, etc.
    status: "completed",
    ended_at: nowISO(),
    home_away: normalizeHomeAway(row.home_away),
    _dirty: true,
    _deleted: false,
    _table: "game_sessions",
  }

  await set(id, updated, st.game.sessions)
  notifyLocalMutate()
  return updated
}

/**
 * Mark a game session and its events as deleted (tombstones),
 * to be pushed to Supabase by the sync engine.
 */
export async function deleteGameSession(id) {
  await ready
  if (!id) return false

  // mark events for this game as deleted
  const evKeys = await keys(st.game.events)
  for (const k of evKeys) {
    const ev = await get(k, st.game.events)
    if (ev?.game_id === id) {
      const updatedEv = {
        ...ev,
        _deleted: true,
        _dirty: true,
        _table: "game_events",
      }
      await set(k, updatedEv, st.game.events)
    }
  }

  // mark the session itself as deleted
  const row = await get(id, st.game.sessions)
  if (row) {
    const updated = {
      ...row,
      _deleted: true,
      _dirty: true,
      _table: "game_sessions",
    }
    await set(id, updated, st.game.sessions)
  }

  notifyLocalMutate()
  return true
}

/* -----------------------------
 * Events (local)
 * ---------------------------*/

export async function addGameEvent(input) {
  await ready

  const game_id = input.game_id ?? input.gameId
  const athlete_id = input.athlete_id ?? input.athleteId ?? getActiveAthleteId() ?? null
  const zone_id = input.zone_id ?? input.zoneId ?? null
  const shot_type = input.shot_type ?? input.shotType ?? null
  const is_three =
    typeof input.is_three !== "undefined" ? input.is_three : input.isThree ?? null
  const made = typeof input.made !== "undefined" ? input.made : null
  const type = input.type
  const mode = input.mode ?? "game"
  const user_id = input.user_id ?? null

  // Layup metadata (optional) – supports both snakeCase + camelCase inputs
  const pickup_type = input.pickup_type ?? input.pickupType ?? null
  const finish_type = input.finish_type ?? input.finishType ?? null

  // Contested (canonical) – accept legacy "pressured" only as backward-compat input
  const contested =
    typeof input.contested !== "undefined"
      ? input.contested
      : typeof input.isContested !== "undefined"
        ? input.isContested
        : typeof input.pressured !== "undefined"
          ? input.pressured
          : null

  if (!game_id) throw new Error("[game-db] addGameEvent: game_id is required")
  if (!type) throw new Error("[game-db] addGameEvent: type is required")

  let tsISO
  if (typeof input.ts === "number") tsISO = new Date(input.ts).toISOString()
  else if (input.ts) tsISO = new Date(input.ts).toISOString()
  else tsISO = nowISO()

  const id = input.id ?? uuid()

  // Preserve existing row fields when editing (if present)
  const existing = await get(id, st.game.events)

  const row = {
    ...(existing || {}),
    id,
    game_id,
    athlete_id,
    user_id: user_id ?? existing?.user_id ?? null,
    mode,
    type,
    zone_id,
    shot_type,
    is_three,
    made,

    // Persist contested (canonical field name)
    contested:
      typeof contested !== "undefined" && contested !== null
        ? !!contested
        : existing?.contested ?? null,

    pickup_type,
    finish_type,
    ts: tsISO,
    _dirty: true,
    _deleted: false,
    _table: "game_events",
  }

  await set(id, row, st.game.events)

  // Keep running totals consistent after any shot/FT insert or edit.
  if (type === "shot" || type === "freethrow") {
    await recomputeAndPersistScoringTotals(game_id)
  }

  notifyLocalMutate()
  return row
}

/**
 * Tombstone-delete a single game event (offline-safe).
 * Sync layer will push delete to Supabase later.
 */
export async function deleteGameEvent(id) {
  await ready
  if (!id) return false

  const cur = await get(id, st.game.events)
  if (!cur) return false

  const updated = {
    ...cur,
    _deleted: true,
    _dirty: true,
    _table: "game_events",
  }

  await set(id, updated, st.game.events)

  // If we deleted a shot/FT, totals must be recomputed.
  if (cur.type === "shot" || cur.type === "freethrow") {
    await recomputeAndPersistScoringTotals(cur.game_id)
  }

  notifyLocalMutate()
  return true
}

export async function listGameEventsBySession(gameId) {
  await ready
  const out = []
  const allKeys = await keys(st.game.events)
  for (const k of allKeys) {
    const ev = await get(k, st.game.events)
    if (
      ev?.game_id === gameId &&
      !ev._deleted &&
      belongsToActiveAthlete(ev.athlete_id)
    ) out.push(ev)
  }
  out.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  return out
}

/* -----------------------------
 * Dirty helpers used by sync layer
 * ---------------------------*/

export async function _allDirtyGame() {
  await ready
  const out = []
  // sessions
  {
    const ks = await keys(st.game.sessions)
    for (const k of ks) {
      const row = await get(k, st.game.sessions)
      if (row?._dirty) out.push(row)
    }
  }
  // events
  {
    const ks = await keys(st.game.events)
    for (const k of ks) {
      const row = await get(k, st.game.events)
      if (row?._dirty) out.push(row)
    }
  }
  return out
}

export async function _markClean(row) {
  await ready
  if (!row?._table) return
  if (row._table === "game_sessions") {
    const cur = await get(row.id, st.game.sessions)
    if (cur) {
      const updated = { ...cur, ...row, _dirty: false }
      await set(row.id, updated, st.game.sessions)
    }
  } else if (row._table === "game_events") {
    const cur = await get(row.id, st.game.events)
    if (cur) {
      const updated = { ...cur, ...row, _dirty: false }
      await set(row.id, updated, st.game.events)
    }
  }
}

/**
 * After a remote delete succeeds, completely remove
 * the row from IndexedDB (used by sync layer).
 */
export async function _purgeGameRow(row) {
  await ready
  if (!row?._table) return
  if (row._table === "game_sessions") {
    await del(row.id, st.game.sessions)
  } else if (row._table === "game_events") {
    await del(row.id, st.game.events)
  }
}

/* -----------------------------
 * Remote → local helpers
 * ---------------------------*/

export async function upsertGameSessionsFromRemote(rows = []) {
  await ready
  const remoteIds = new Set(rows.map((r) => r.id).filter(Boolean))

  // 1) Remove any local clean sessions that don't exist remotely
  const localKeys = await keys(st.game.sessions)
  for (const k of localKeys) {
    const local = await get(k, st.game.sessions)
    if (!local) continue
    if (local._dirty) continue // keep unsynced offline changes
    if (!remoteIds.has(local.id)) {
      await del(k, st.game.sessions)
    }
  }

  // 2) Upsert / merge remote sessions as clean
  for (const remote of rows) {
    if (!remote?.id) continue
    const existing = await get(remote.id, st.game.sessions)
    const merged = {
      ...(existing || {}),
      ...remote,
      home_away: normalizeHomeAway(remote.home_away ?? existing?.home_away),
      _dirty: false,
      _deleted: false,
      _table: "game_sessions",
    }
    await set(remote.id, merged, st.game.sessions)
  }
}

export async function upsertGameEventsFromRemote(rows = []) {
  await ready
  const remoteIds = new Set(rows.map((r) => r.id).filter(Boolean))

  // 1) Remove any local clean events that don't exist remotely
  const localKeys = await keys(st.game.events)
  for (const k of localKeys) {
    const local = await get(k, st.game.events)
    if (!local) continue
    if (local._dirty) continue // keep unsynced offline changes
    if (!remoteIds.has(local.id)) {
      await del(k, st.game.events)
    }
  }

  // 2) Upsert / merge remote events as clean
  for (const remote of rows) {
    if (!remote?.id) continue
    const existing = await get(remote.id, st.game.events)
    const merged = {
      ...(existing || {}),
      ...remote,
      _dirty: false,
      _deleted: false,
      _table: "game_events",
    }
    await set(remote.id, merged, st.game.events)
  }
}

export async function hydrateGameFromSupabase() {
  await ready

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) {
    console.warn("[game-db] hydrateGameFromSupabase: getUser error", userErr)
    return { userId: null, sessions: [], events: [] }
  }

  const user = userData?.user
  if (!user) {
    return { userId: null, sessions: [], events: [] }
  }

  const userId = user.id

  const [{ data: sessions, error: sErr }, { data: events, error: eErr }] =
    await Promise.all([
      supabase
        .from("game_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("date_iso", { ascending: false }),
      supabase
        .from("game_events")
        .select("*")
        .eq("user_id", userId)
        .order("ts", { ascending: true }),
    ])

  if (sErr) console.warn("[game-db] hydrate sessions error", sErr)
  if (eErr) console.warn("[game-db] hydrate events error", eErr)

  await upsertGameSessionsFromRemote(sessions || [])
  await upsertGameEventsFromRemote(events || [])

  return { userId, sessions: sessions || [], events: events || [] }
}
