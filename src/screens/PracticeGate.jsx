// src/screens/PracticeGate.jsx
import { useEffect, useMemo, useState } from "react"
import {
  addPracticeSession,
  endPracticeSession,
  deletePracticeSession,
  listPracticeSessions,
  listActivePracticeSessions,
} from "../lib/practice-db"
import { PlayCircle, Trash2, ChevronDown } from "lucide-react"

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString() } catch { return iso || "—" }
}

function dayName(iso) {
  try { return new Date(iso).toLocaleDateString(undefined, { weekday: "long" }) } catch { return "—" }
}

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

export default function PracticeGate({ navigate }) {
  const [sessions, setSessions] = useState([])
  const [active, setActive] = useState(null)
  const [confirmingNew, setConfirmingNew] = useState(false)
  const [openMonth, setOpenMonth] = useState(null)

  const groupedMonths = useMemo(() => {
    const rows = sessions
      // don't show the current active session in "Previous"
      .filter(s => !active || s.id !== active.id)
      .filter(s => s.started_at || s.date_iso)

    if (!rows.length) return []

    const map = new Map()
    for (const s of rows) {
      const base = s.started_at || s.date_iso
      const key = monthKey(base)
      const label = monthLabel(base)
      if (!map.has(key)) {
        map.set(key, { key, label, sessions: [] })
      }
      map.get(key).sessions.push(s)
    }

    const months = Array.from(map.values())
    // Months in descending order
    months.sort((a, b) => b.key.localeCompare(a.key))
    // Sessions within each month in descending order
    for (const m of months) {
      m.sessions.sort((a, b) => {
        const da = a.started_at || a.date_iso || ""
        const db = b.started_at || b.date_iso || ""
        return db.localeCompare(da)
      })
    }
    return months
  }, [sessions, active])

  async function refresh() {
    const all = await listPracticeSessions()
    const actives = await listActivePracticeSessions()
    setSessions(all)
    setActive(actives[0] || null)
  }
  useEffect(() => { refresh() }, [])

  // Actions
  const startNew = async () => {
    if (active) { setConfirmingNew(true); return }
    const row = await addPracticeSession({})
    await refresh()
    navigate?.("practice-log", { id: row.id, started_at: row.started_at })
  }

  const confirmEndAndStart = async () => {
    if (active) await endPracticeSession(active.id)
    const row = await addPracticeSession({})
    setConfirmingNew(false)
    await refresh()
    navigate?.("practice-log", { id: row.id, started_at: row.started_at })
  }

  const resumeActive = () => {
    if (!active) return
    navigate?.("practice-log", { id: active.id, started_at: active.started_at })
  }

  const openSession = (id) => {
    const s = sessions.find(x => x.id === id)
    if (!s) return
    navigate?.("practice-log", { id: s.id, started_at: s.started_at })
  }

  const onDelete = async (id) => {
    await deletePracticeSession(id)
    await refresh()
  }

  return (
    <div className="page p-3 pb-20 max-w-screen-sm mx-auto">
      <h1 className="text-2xl font-bold mb-3">Practice Sessions</h1>

      {/* Start New */}
      <button
        type="button"
        onClick={startNew}
        className="w-full btn btn-blue h-11 rounded-xl font-semibold flex items-center justify-center gap-2 mb-2"
      >
        <PlayCircle size={18} /> Start New Session
      </button>

      {/* Resume Active */}
      <button
        type="button"
        onClick={resumeActive}
        disabled={!active}
        className={`w-full h-11 rounded-xl font-semibold flex items-center justify-center gap-2 mb-4
          ${active ? "btn btn-blue" : "btn btn-disabled"}`}
      >
        <PlayCircle size={18} /> Resume Active Session
      </button>

      <h2 className="text-lg font-semibold mb-2">Previous Sessions</h2>

      <div className="space-y-3">
        {groupedMonths.map((month) => (
          <div key={month.key} className="rounded-xl border bg-white">
            <button
              type="button"
              onClick={() => setOpenMonth(openMonth === month.key ? null : month.key)}
              className="w-full flex items-center justify-between px-3 py-2"
            >
              <span className="text-sm font-semibold text-slate-900">
                {month.label}
              </span>
              <ChevronDown
                size={18}
                className={`transition-transform ${openMonth === month.key ? "rotate-180" : ""}`}
              />
            </button>

            {openMonth === month.key && (
              <div className="border-t border-slate-100">
                {month.sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-3 border-b last:border-b-0"
                  >
                    <button
                      className="flex-1 text-left"
                      onClick={() => openSession(s.id)}
                      aria-label="Open session"
                    >
                      <div className="font-medium">
                        {dayName(s.started_at || s.date_iso)}
                      </div>
                      <div className="text-sm text-slate-500">
                        {fmtDate(s.started_at || s.date_iso)}
                      </div>
                    </button>
                    <button
                      className="p-2 rounded-md text-red-600 hover:bg-red-50"
                      onClick={() => onDelete(s.id)}
                      aria-label="Delete session"
                      title="Delete session"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {groupedMonths.length === 0 && (
          <div className="text-sm text-slate-500">No previous sessions yet.</div>
        )}
      </div>

      {/* Confirm modal */}
      {confirmingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[90%] max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <div className="text-base font-semibold mb-1">Start New Session?</div>
            <p className="text-sm text-slate-600 mb-4">
              You already have an active session. Starting a new one will end the current session and begin a new session now.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn btn-blue" onClick={() => setConfirmingNew(false)}>Cancel</button>
              <button className="btn btn-emerald" onClick={confirmEndAndStart}>End &amp; Start New</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
