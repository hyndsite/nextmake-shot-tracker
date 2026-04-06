import { supabase, getUser } from "./supabase"

const MAX_METRICS = 5
const VALID_RANGE_KEYS = new Set(["7d", "30d", "90d", "180d", "1y"])
const VALID_SOURCE_MODES = new Set(["game", "practice", "both"])

async function requireUserId() {
  const user = await getUser()
  if (!user) throw new Error("No authenticated user")
  return user.id
}

async function assertAthleteOwnedByUser(userId, athleteId) {
  const { data, error } = await supabase
    .from("athlete_profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("id", athleteId)
    .maybeSingle()

  if (error) {
    console.error("[athlete-dashboard-db] assertAthleteOwnedByUser error:", error)
    throw error
  }
  if (!data?.id) {
    throw new Error("Athlete does not belong to the authenticated user")
  }
}

function sanitizeMetricRow(row, fallbackPosition) {
  const metricKey = String(row?.metricKey || row?.metric_key || "").trim()
  const rangeKey = String(row?.rangeKey || row?.range_key || "").trim()
  const sourceMode = String(row?.sourceMode || row?.source_mode || "both").trim()
  const enabled = row?.enabled !== false
  const rawPos = Number.isInteger(row?.position)
    ? row.position
    : Number.isInteger(row?.position_index)
      ? row.position_index
      : fallbackPosition

  if (!metricKey) throw new Error("Each dashboard metric requires a metricKey")
  if (!VALID_RANGE_KEYS.has(rangeKey)) {
    throw new Error("Each dashboard metric requires a valid rangeKey")
  }
  if (!VALID_SOURCE_MODES.has(sourceMode)) {
    throw new Error("Each dashboard metric requires a valid sourceMode")
  }
  if (!Number.isInteger(rawPos) || rawPos < 0 || rawPos >= MAX_METRICS) {
    throw new Error("Each dashboard metric requires position 0-4")
  }

  return {
    metric_key: metricKey,
    range_key: rangeKey,
    source_mode: sourceMode,
    position: rawPos,
    enabled,
  }
}

function isMissingSourceModeColumn(error) {
  return error?.code === "42703" && String(error?.message || "").includes("source_mode")
}

async function runListQuery({ userId, athleteId, includeDisabled, columns }) {
  let query = supabase
    .from("athlete_dashboard_metrics")
    .select(columns)
    .eq("user_id", userId)
    .eq("athlete_id", athleteId)
    .order("position", { ascending: true })

  if (!includeDisabled) {
    query = query.eq("enabled", true)
  }

  return await query
}

export async function listAthleteDashboardMetrics({ athleteId, includeDisabled = false }) {
  if (!athleteId) throw new Error("Athlete id is required")
  const userId = await requireUserId()
  await assertAthleteOwnedByUser(userId, athleteId)

  const standardColumns = "*"
  const legacyColumns = "id, athlete_id, metric_key, range_key, position, enabled, created_at, updated_at"
  const standardResp = await runListQuery({
    userId,
    athleteId,
    includeDisabled,
    columns: standardColumns,
  })

  if (!standardResp.error) {
    return (standardResp.data || []).map((row) => ({
      ...row,
      source_mode: row?.source_mode || "both",
    }))
  }
  if (!isMissingSourceModeColumn(standardResp.error)) {
    console.error("[athlete-dashboard-db] listAthleteDashboardMetrics error:", standardResp.error)
    throw standardResp.error
  }

  const legacyResp = await runListQuery({
    userId,
    athleteId,
    includeDisabled,
    columns: legacyColumns,
  })
  if (legacyResp.error) {
    console.error("[athlete-dashboard-db] listAthleteDashboardMetrics legacy fallback error:", legacyResp.error)
    throw legacyResp.error
  }

  return (legacyResp.data || []).map((row) => ({
    ...row,
    source_mode: row?.source_mode || "both",
  }))
}

export async function replaceAthleteDashboardMetrics(athleteId, metricRows = []) {
  if (!athleteId) throw new Error("Athlete id is required")
  if (!Array.isArray(metricRows)) throw new Error("metricRows must be an array")
  if (metricRows.length > MAX_METRICS) {
    throw new Error("You can select at most 5 dashboard metrics")
  }

  const userId = await requireUserId()
  await assertAthleteOwnedByUser(userId, athleteId)
  const sanitized = metricRows.map((row, index) => sanitizeMetricRow(row, index))

  const usedPositions = new Set()
  for (const row of sanitized) {
    if (usedPositions.has(row.position)) {
      throw new Error("Dashboard metric positions must be unique")
    }
    usedPositions.add(row.position)
  }

  const { error: deleteError } = await supabase
    .from("athlete_dashboard_metrics")
    .delete()
    .eq("user_id", userId)
    .eq("athlete_id", athleteId)

  if (deleteError) {
    console.error("[athlete-dashboard-db] replaceAthleteDashboardMetrics delete error:", deleteError)
    throw deleteError
  }

  if (!sanitized.length) return []

  const payload = sanitized.map((row) => ({
    user_id: userId,
    athlete_id: athleteId,
    metric_key: row.metric_key,
    range_key: row.range_key,
    source_mode: row.source_mode,
    position: row.position,
    enabled: row.enabled,
  }))

  const { data, error } = await supabase
    .from("athlete_dashboard_metrics")
    .insert(payload)
    .select("id, athlete_id, metric_key, range_key, source_mode, position, enabled, created_at, updated_at")
    .order("position", { ascending: true })

  if (error) {
    console.error("[athlete-dashboard-db] replaceAthleteDashboardMetrics insert error:", error)
    throw error
  }

  return data || []
}

export { MAX_METRICS, VALID_RANGE_KEYS, VALID_SOURCE_MODES }
