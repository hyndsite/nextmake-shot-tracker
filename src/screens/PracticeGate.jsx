// src/screens/PracticeGate.jsx
import { useEffect, useMemo, useState } from "react"
import {
  addPracticeSession,
  endPracticeSession,
  deletePracticeSession,
  listPracticeSessions,
  listActivePracticeSessions,
} from "../lib/practice-db"
import { PlayCircle, Trash2 } from "lucide-react"

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString() } catch { return iso || "—" }
}
function dayName(iso) {
  try { return new Date(iso).toLocaleDateString(undefined, { weekday: "long" }) } catch { return "—" }
}

export default function PracticeGate({ navigate }) {
  const [sessions, setSessions] = useState([])
  const [active, setActive] = useState(null)
  const [confirmingNew, setConfirmingNew] = useState(false)

  async function refresh() {
    const all = await listPracticeSessions()
    const actives = await listActivePracticeSessions()
    setSessions(all)
    setActive(actives[0] || null)
  }
  useEffect(() => { refresh() }, [])

  const previous = useMemo(() =>
    sessions
      .filter(s => s.id !== active?.id)
      .sort((a,b) => (b.started_at || "").localeCompare(a.started_at || "")),
    [sessions, active]
  )

  // Actions
  const startNew = async () => {
    if (active) { setConfirmingNew(true); return }
    const row = await addPracticeSession({})
    await refresh()
    navigate?.("practice-log", { id: row.id })
  }

  const confirmEndAndStart = async () => {
    if (active) await endPracticeSession(active.id)
    const row = await addPracticeSession({})
    setConfirmingNew(false)
    await refresh()
    navigate?.("practice-log", { id: row.id })
  }

  const resumeActive = () => {
    if (!active) return
    navigate?.("practice-log", { id: active.id })
  }

  const openSession = (id) => {
    navigate?.("practice-log", { id })
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

      <div className="space-y-2">
        {previous.map(s => (
          <div key={s.id} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-3">
            <button
              className="flex-1 text-left"
              onClick={() => openSession(s.id)}
              aria-label="Open session"
            >
              <div className="font-medium">{dayName(s.date_iso)}</div>
              <div className="text-sm text-slate-500">{fmtDate(s.date_iso)}</div>
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
        {previous.length === 0 && (
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
