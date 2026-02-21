import { supabase, getUser } from "./supabase"
import { buildInitials } from "./athlete-db"

const COLOR_POOL = [
  "#FDE68A",
  "#FBCFE8",
  "#BFDBFE",
  "#C7D2FE",
  "#A7F3D0",
  "#FED7AA",
  "#DDD6FE",
  "#BBF7D0",
]

function randomLightColor() {
  return COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)]
}

async function requireUserId() {
  const user = await getUser()
  if (!user) throw new Error("No authenticated user")
  return user.id
}

export async function createAthleteProfile({ firstName, lastName = "", avatarColor }) {
  const first_name = String(firstName ?? "").trim().slice(0, 20)
  const last_name = String(lastName ?? "").trim().slice(0, 20)

  if (!first_name) throw new Error("First name is required")

  const user_id = await requireUserId()
  const initials = buildInitials(first_name, last_name)
  const resolvedAvatarColor = avatarColor || randomLightColor()

  const { data, error } = await supabase
    .from("athlete_profiles")
    .insert([
      {
        user_id,
        first_name,
        last_name,
        initials,
        avatar_color: resolvedAvatarColor,
      },
    ])
    .select("id, first_name, last_name, initials, avatar_color, created_at, archived_at")
    .single()

  if (error) {
    console.error("[athlete-profiles-db] createAthleteProfile error:", error)
    if (String(error.code || "") === "42P01") {
      throw new Error("Supabase table 'athlete_profiles' does not exist yet.")
    }
    throw error
  }

  return data
}

export async function listAthleteProfiles({ includeArchived = false } = {}) {
  const user_id = await requireUserId()

  let query = supabase
    .from("athlete_profiles")
    .select("id, first_name, last_name, initials, avatar_color, created_at, archived_at")
    .eq("user_id", user_id)
    .order("created_at", { ascending: true })

  if (!includeArchived) {
    query = query.is("archived_at", null)
  }

  const { data, error } = await query
  if (error) {
    console.error("[athlete-profiles-db] listAthleteProfiles error:", error)
    throw error
  }

  return data || []
}

export async function archiveAthleteProfile(athleteId) {
  if (!athleteId) throw new Error("Athlete id is required")
  const user_id = await requireUserId()

  const { data, error } = await supabase
    .from("athlete_profiles")
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", athleteId)
    .eq("user_id", user_id)
    .select("id")
    .single()

  if (error) {
    console.error("[athlete-profiles-db] archiveAthleteProfile error:", error)
    if (String(error.code || "") === "42703") {
      throw new Error("Supabase column 'archived_at' does not exist yet.")
    }
    throw error
  }

  return data
}

export async function updateAthleteProfile(
  athleteId,
  { firstName, lastName = "", avatarColor } = {},
) {
  if (!athleteId) throw new Error("Athlete id is required")
  const user_id = await requireUserId()

  const first_name = String(firstName ?? "").trim().slice(0, 20)
  const last_name = String(lastName ?? "").trim().slice(0, 20)
  const avatar_color = String(avatarColor ?? "").trim()

  if (!first_name) throw new Error("First name is required")

  const payload = {
    first_name,
    last_name,
    initials: buildInitials(first_name, last_name),
    updated_at: new Date().toISOString(),
  }
  if (avatar_color) payload.avatar_color = avatar_color

  const { data, error } = await supabase
    .from("athlete_profiles")
    .update(payload)
    .eq("id", athleteId)
    .eq("user_id", user_id)
    .select("id, first_name, last_name, initials, avatar_color, created_at, archived_at")
    .single()

  if (error) {
    console.error("[athlete-profiles-db] updateAthleteProfile error:", error)
    if (String(error.code || "") === "42P01") {
      throw new Error("Supabase table 'athlete_profiles' does not exist yet.")
    }
    throw error
  }

  return data
}
