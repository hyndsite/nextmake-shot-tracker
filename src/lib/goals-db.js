// src/lib/goals-db.js
import { supabase, getUser } from "./supabase"
import { getActiveAthleteId } from "./athlete-db"

/**
 * Internal: ensure we have an authenticated user and return their id.
 * Mirrors the pattern used in game-db.js where getUser() is the single
 * source of truth for the current Supabase user.
 */
async function requireUserId() {
  const user = await getUser()
  if (!user) {
    throw new Error("No authenticated user")
  }
  return user.id
}

/**
 * Fetch all goal sets + their goals for the current user.
 * Returns:
 * [
 *   { id, name, type, due_date, created_at, goals: [ ... ] }
 * ]
 */
export async function listGoalSetsWithGoals({ athleteId } = {}) {
  const userId = await requireUserId()
  const resolvedAthleteId = athleteId ?? getActiveAthleteId()

  const { data: sets, error: setErr } = await supabase
    .from("goal_sets")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { ascending: true })

  if (setErr) {
    console.warn("[goals-db] listGoalSetsWithGoals sets error:", setErr)
    throw setErr
  }

  if (!sets?.length) return []
  if (!resolvedAthleteId) return []

  const filteredSets = sets.filter((s) => s.athlete_id === resolvedAthleteId)
  if (!filteredSets.length) return []

  const setIds = filteredSets.map((s) => s.id)

  const { data: goals, error: goalErr } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .in("set_id", setIds)
    .order("created_at", { ascending: true })

  if (goalErr) {
    console.warn("[goals-db] listGoalSetsWithGoals goals error:", goalErr)
    throw goalErr
  }

  const bySet = new Map()
  for (const g of goals || []) {
    if (g.athlete_id !== resolvedAthleteId) continue
    if (!bySet.has(g.set_id)) bySet.set(g.set_id, [])
    bySet.get(g.set_id).push(g)
  }

  return filteredSets.map((s) => ({
    ...s,
    goals: bySet.get(s.id) || [],
  }))
}

/**
 * Create a new goal set for the current user.
 * @param {{
 *   name: string,
 *   type: "practice" | "game",
 *   dueDate: string,    // YYYY-MM-DD
 *   startDate?: string, // YYYY-MM-DD (defaults to today on the DB)
 * }} input
 */
export async function createGoalSet({ name, type, dueDate, startDate }) {
  const userId = await requireUserId()
  const athleteId = getActiveAthleteId()
  if (!athleteId) {
    throw new Error("No active athlete selected")
  }

  const { data, error } = await supabase
    .from("goal_sets")
    .insert([
      {
        user_id: userId,
        athlete_id: athleteId,
        name,
        type, // "practice" | "game"
        due_date: dueDate,
        // if caller passes nothing, DB default CURRENT_DATE is used
        ...(startDate ? { start_date: startDate } : {}),
      },
    ])
    .select("*")
    .single()

  if (error) {
    console.error("[goals-db] createGoalSet error:", error)
    throw error
  }

  return data
}

/**
 * Update an existing goal set (does not change user_id).
 */
export async function updateGoalSet(id, patch) {
  const { data, error } = await supabase
    .from("goal_sets")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    console.error("[goals-db] updateGoalSet error:", error)
    throw error
  }
  return data
}

/**
 * Archive a goal set (soft-hide from "Active" listing).
 * Assumes an `archived boolean` column exists on goal_sets.
 */
export async function archiveGoalSet(id) {
  try {
    const data = await updateGoalSet(id, { archived: true })
    return data
  } catch (error) {
    console.error("[goals-db] archiveGoalSet error:", error)
    throw error
  }
}

/**
 * Delete all goals belonging to a given set for the current user.
 */
export async function deleteGoalsBySet(setId) {
  const userId = await requireUserId()

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("user_id", userId)
    .eq("set_id", setId)

  if (error) {
    console.error("[goals-db] deleteGoalsBySet error:", error)
    throw error
  }
}

/**
 * Delete a goal set (and, ideally, its goals first).
 */
export async function deleteGoalSet(id) {
  const userId = await requireUserId()

  const { error } = await supabase
    .from("goal_sets")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)

  if (error) {
    console.error("[goals-db] deleteGoalSet error:", error)
    throw error
  }
}

/* ------------------------ goals ------------------------ */

/**
 * Create a goal inside a set for the current user.
 * Schema columns used: user_id, set_id, name, details, metric,
 * target_value, target_end_date
 *
 * @param {{
 *   setId: string,
 *   name?: string,
 *   details?: string,
 *   metric: string,
 *   targetValue: number,
 *   targetEndDate: string, // ISO date (YYYY-MM-DD)
 * }} input
 */
export async function createGoal({
  setId,
  athleteId,
  name,
  details,
  metric,
  targetValue,
  targetEndDate,
  targetType = "percent",
  zoneId = null,
}) {
  const userId = await requireUserId()
  if (!athleteId) {
    throw new Error("No active athlete selected")
  }

  const { data, error } = await supabase
    .from("goals")
    .insert([
      {
        user_id: userId,
        athlete_id: athleteId,
        set_id: setId,
        name: name ?? null,
        details: details ?? null,
        metric,
        target_value: targetValue,
        target_end_date: targetEndDate,
        target_type: targetType,
        zone_id: zoneId,
      },
    ])
    .select("*")
    .single()

  if (error) {
    console.error("[goals-db] createGoal error:", error)
    throw error
  }

  return data
}

/**
 * Update a goal by id.
 * Patch shape should only include columns that actually exist in your table
 * (e.g., name, details, metric, target_value, target_end_date,
 * current_value, etc.).
 */
export async function updateGoal(id, patch) {
  const { data, error } = await supabase
    .from("goals")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    console.error("[goals-db] updateGoal error:", error)
    throw error
  }
  return data
}

/**
 * Delete a goal by id for the current user.
 */
export async function deleteGoal(id) {
  const userId = await requireUserId()

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)

  if (error) {
    console.error("[goals-db] deleteGoal error:", error)
    throw error
  }
}
