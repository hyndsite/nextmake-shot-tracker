// src/lib/goals-db.js
import { supabase, getUser } from "./supabase"

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
export async function listGoalSetsWithGoals() {
  const userId = await requireUserId()

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

  const setIds = sets.map((s) => s.id)

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
    if (!bySet.has(g.set_id)) bySet.set(g.set_id, [])
    bySet.get(g.set_id).push(g)
  }

  return sets.map((s) => ({
    ...s,
    goals: bySet.get(s.id) || [],
  }))
}

/**
 * Create a new goal set for the current user.
 * @param {{ name: string, type: "practice" | "game", dueDate: string }} input
 */
export async function createGoalSet({ name, type, dueDate }) {
  const userId = await requireUserId()

  const { data, error } = await supabase
    .from("goal_sets")
    .insert([
      {
        user_id: userId,
        name,
        type, // "practice" | "game"
        due_date: dueDate,
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
 * Schema columns used: user_id, set_id, name, details, metric, target_value
 *
 * @param {{
 *   setId: string,
 *   name?: string,
 *   details?: string,
 *   metric: string,
 *   targetValue: number
 * }} input
 */
export async function createGoal({
  setId,
  name,
  details,
  metric,
  targetValue,
}) {
  const userId = await requireUserId()

  const { data, error } = await supabase
    .from("goals")
    .insert([
      {
        user_id: userId,
        set_id: setId,
        name: name ?? null,
        details: details ?? null,
        metric,
        target_value: targetValue,
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
 * (e.g., name, details, metric, target_value, current_value, etc.).
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
