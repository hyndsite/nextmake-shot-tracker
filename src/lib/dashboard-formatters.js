export function fullName(athlete) {
  if (!athlete) return "No active athlete"
  return `${athlete.first_name}${athlete.last_name ? ` ${athlete.last_name}` : ""}`
}

export function zoneLabel(zoneId) {
  if (!zoneId) return "Unknown zone"
  if (zoneId === "free_throw") return "Free Throw"
  return zoneId
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function pct(makes, attempts) {
  if (!attempts) return 0
  return (makes / attempts) * 100
}

export function fmtPct(value) {
  return `${(Math.round((Number(value) || 0) * 10) / 10).toFixed(1)}%`
}

export function fmtValue(value, format) {
  if (format === "percent") return fmtPct(value)
  return String(Math.round(Number(value) || 0))
}
