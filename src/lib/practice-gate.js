function monthKey(iso) {
  try {
    const d = new Date(iso || Date.now())
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  } catch {
    return "0000-00"
  }
}

function monthLabel(iso) {
  try {
    const d = new Date(iso || Date.now())
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" })
  } catch {
    return "Unknown"
  }
}

export function getInitialSelectedAthleteId(athletes, activeAthleteId) {
  return activeAthleteId || athletes[0]?.id || ""
}

export function groupPracticeSessionsByMonth(sessions, activeSessionId) {
  const rows = (sessions || [])
    .filter((session) => !activeSessionId || session.id !== activeSessionId)
    .filter((session) => session.started_at || session.date_iso)

  if (!rows.length) return []

  const groups = new Map()
  for (const session of rows) {
    const base = session.started_at || session.date_iso
    const key = monthKey(base)
    const label = monthLabel(base)
    if (!groups.has(key)) {
      groups.set(key, { key, label, sessions: [] })
    }
    groups.get(key).sessions.push(session)
  }

  const months = Array.from(groups.values())
  months.sort((a, b) => b.key.localeCompare(a.key))
  for (const month of months) {
    month.sessions.sort((a, b) => {
      const da = a.started_at || a.date_iso || ""
      const db = b.started_at || b.date_iso || ""
      return db.localeCompare(da)
    })
  }

  return months
}
