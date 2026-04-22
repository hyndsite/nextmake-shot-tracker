export function listPreviousGameSessions(sessions) {
  return (sessions || []).filter((session) => session.status === "completed")
}

export function groupPreviousGamesByLevel(previous) {
  const groups = new Map()

  for (const session of previous) {
    const key = session.level || "Games"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(session)
  }

  for (const rows of groups.values()) {
    rows.sort((a, b) =>
      (b.date_iso || b.started_at || "").localeCompare(
        a.date_iso || a.started_at || "",
      ),
    )
  }

  return groups
}
