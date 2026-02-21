const ATHLETES_KEY = "nm_athletes"
const ACTIVE_ATHLETE_KEY = "nm_active_athlete_id"

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

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function toNowISO() {
  return new Date().toISOString()
}

function createId() {
  return `ath_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

function cleanName(value) {
  return String(value ?? "").trim().slice(0, 20)
}

export function buildInitials(firstName, lastName = "") {
  const f = cleanName(firstName)
  const l = cleanName(lastName)
  const firstLetter = f.slice(0, 1)
  const lastLetter = l.slice(0, 1)
  return `${firstLetter}${lastLetter}`.toUpperCase() || "A"
}

function randomLightColor() {
  return COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)]
}

export function listAthletes() {
  const rows = readJSON(ATHLETES_KEY, [])
  if (!Array.isArray(rows)) return []
  return rows.filter((row) => !row?.archived_at)
}

export function replaceAthletes(rows) {
  const next = Array.isArray(rows) ? rows : []
  writeJSON(ATHLETES_KEY, next)

  const activeId = localStorage.getItem(ACTIVE_ATHLETE_KEY)
  if (!activeId) {
    const fallback = next.find((row) => !row?.archived_at)
    if (fallback?.id) setActiveAthlete(fallback.id)
    return
  }

  const activeStillValid = next.some((row) => row.id === activeId && !row?.archived_at)
  if (!activeStillValid) {
    const fallback = next.find((row) => !row?.archived_at)
    if (fallback?.id) setActiveAthlete(fallback.id)
    else localStorage.removeItem(ACTIVE_ATHLETE_KEY)
  }
}

export function getActiveAthleteId() {
  const activeId = localStorage.getItem(ACTIVE_ATHLETE_KEY)
  if (activeId) {
    const activeExists = listAthletes().some((row) => row.id === activeId)
    if (activeExists) return activeId
    localStorage.removeItem(ACTIVE_ATHLETE_KEY)
  }

  const rows = listAthletes()
  if (!rows.length) return null
  const fallbackId = rows[0].id
  setActiveAthlete(fallbackId)
  return fallbackId
}

export function getActiveAthlete() {
  const activeId = getActiveAthleteId()
  if (!activeId) return null
  return listAthletes().find((row) => row.id === activeId) ?? null
}

export function setActiveAthlete(athleteId) {
  if (!athleteId) {
    localStorage.removeItem(ACTIVE_ATHLETE_KEY)
    return
  }
  localStorage.setItem(ACTIVE_ATHLETE_KEY, athleteId)
}

export function addAthlete({ firstName, lastName = "", id, createdAt, avatarColor }) {
  const first_name = cleanName(firstName)
  const last_name = cleanName(lastName)

  if (!first_name) {
    throw new Error("First name is required")
  }

  const athlete = {
    id: id || createId(),
    first_name,
    last_name,
    initials: buildInitials(first_name, last_name),
    avatar_color: avatarColor || randomLightColor(),
    created_at: createdAt || toNowISO(),
    archived_at: null,
  }

  const rows = listAthletes()
  rows.push(athlete)
  writeJSON(ATHLETES_KEY, rows)

  if (!getActiveAthleteId()) {
    setActiveAthlete(athlete.id)
  }

  return athlete
}

export function archiveAthlete(athleteId) {
  if (!athleteId) return null
  const rows = readJSON(ATHLETES_KEY, [])
  if (!Array.isArray(rows)) return null

  const next = rows.map((row) =>
    row?.id === athleteId ? { ...row, archived_at: toNowISO() } : row
  )
  writeJSON(ATHLETES_KEY, next)

  const activeId = localStorage.getItem(ACTIVE_ATHLETE_KEY)
  if (activeId === athleteId) {
    const fallback = next.find((row) => !row?.archived_at)
    if (fallback?.id) setActiveAthlete(fallback.id)
    else localStorage.removeItem(ACTIVE_ATHLETE_KEY)
  }

  return next.find((row) => row?.id === athleteId) ?? null
}
