// src/lib/game-db.js
import { createStore, get, set, del, keys } from "idb-keyval"
import { uuid } from "./util-id"
import { notifyLocalMutate } from "./sync-notify"
import { whenIdbReady } from "./idb-init"
import { supabase } from "./supabase"


const ready = whenIdbReady()
const nowISO = () => new Date().toISOString()

export const st = {
  game: {
    sessions: createStore("game", "sessions"),
    events: createStore("game", "events"),
  },
}

// --- helpers ---
async function computeExistingScoringTotals(gameId) {
  await ready
  const evKeys = await keys(st.game.events)
  let two = 0
  let three = 0
  let ft = 0

  for (const k of evKeys) {
    const ev = await get(k, st.game.events)
    if (!ev || ev.game_id !== gameId) continue
    if (ev.type === "shot" && ev.made) {
      if (ev.is_three) three++
      else two++
    } else if (ev.type === "freethrow" && ev.made) {
      ft++
    }
  }

  const totalPoints = two * 2 + three * 3 + ft
  return { two, three, ft, totalPoints }
}

function normalizeHomeAway(v) {
  if (v == null) return "Home"
  const s = String(v).trim().toLowerCase()
  if (s === "home" || s === "h") return "Home"
  if (s === "away" || s === "a") return "Away"
  return "Home"
}

// optional utility to normalize any existing rows
export async function fixBadHomeAway() {
  await ready
  const ks = await keys(st.game.sessions)
  for (const k of ks) {
    const row = await get(k, st.game.sessions)
    if (!row) continue
    const norm = normalizeHomeAway(row.home_away)
    if (row.home_away !== norm) {
      await set(
        k,
        { ...row, home_away: norm, _dirty: true, _table: "game_sessions" },
        st.game.sessions,
      )
    }
  }
  notifyLocalMutate()
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
    if (row && !row._deleted) rows.push(row)
  }
  rows.sort((a, b) => (b.started_at || "").localeCompare(a.started_at || ""))
  return rows
}

export async function getGameSession(id) {
  await ready
  if (!id) return null
  return await get(id, st.game.sessions)
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

  const row = {
    id,
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
 * to be pushed to Supabase by the sync engine. Does NOT
 * immediately delete from IndexedDB so that sync can see them.
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
  const zone_id = input.zone_id ?? input.zoneId ?? null
  const shot_type = input.shot_type ?? input.shotType ?? null
  const is_three =
    typeof input.is_three !== "undefined" ? input.is_three : input.isThree ?? null
  const made = typeof input.made !== "undefined" ? input.made : null
  const type = input.type
  const mode = input.mode ?? "game"
  const user_id = input.user_id ?? null

  if (!game_id) throw new Error("[game-db] addGameEvent: game_id is required")
  if (!type) throw new Error("[game-db] addGameEvent: type is required")

  let tsISO
  if (typeof input.ts === "number") tsISO = new Date(input.ts).toISOString()
  else if (input.ts) tsISO = new Date(input.ts).toISOString()
  else tsISO = nowISO()

  const id = input.id ?? uuid()

  // Base row
  const row = {
    id,
    game_id,
    user_id,
    mode,
    type,
    zone_id,
    shot_type,
    is_three,
    made,
    ts: tsISO,
    _dirty: true,
    _deleted: false,
    _table: "game_events",
  }

  // Attach running scoring totals for shot / freethrow events
  if (type === "shot" || type === "freethrow") {
    const { two, three, ft, totalPoints } = await computeExistingScoringTotals(
      game_id,
    )

    let t2 = two
    let t3 = three
    let tft = ft
    let tp = totalPoints

    if (type === "shot" && made) {
      if (is_three) {
        t3 += 1
        tp += 3
      } else {
        t2 += 1
        tp += 2
      }
    } else if (type === "freethrow" && made) {
      tft += 1
      tp += 1
    }

    row.total_2pt_made = t2
    row.total_3pt_made = t3
    row.total_ft_made = tft
    row.total_points = tp
  }

  await set(id, row, st.game.events)
  notifyLocalMutate()
  return row
}


export async function listGameEventsBySession(gameId) {
  await ready
  const out = []
  const allKeys = await keys(st.game.events)
  for (const k of allKeys) {
    const ev = await get(k, st.game.events)
    if (ev?.game_id === gameId && !ev._deleted) out.push(ev)
  }
  out.sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime(),
  )
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

/**
 * Upsert remote game_sessions into IndexedDB as "clean" rows.
 */
export async function upsertGameSessionsFromRemote(rows = []) {
  await ready
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

/**
 * Upsert remote game_events into IndexedDB as "clean" rows.
 */
export async function upsertGameEventsFromRemote(rows = []) {
  await ready
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

/**
 * Convenience helper for debugging: fetch all game_sessions
 * and game_events for the current Supabase user and hydrate IDB.
 */
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
