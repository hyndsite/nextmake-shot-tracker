import { useEffect, useMemo, useState } from "react"
import { Archive, ArrowLeftRight, Plus } from "lucide-react"

import {
  addAthlete,
  archiveAthlete,
  getActiveAthleteId,
  listAthletes,
  replaceAthletes,
  setActiveAthlete,
} from "../lib/athlete-db"
import {
  archiveAthleteProfile,
  createAthleteProfile,
  listAthleteProfiles,
} from "../lib/athlete-profiles-db"

function fullName(athlete) {
  if (!athlete) return "No active athlete"
  return `${athlete.first_name}${athlete.last_name ? ` ${athlete.last_name}` : ""}`
}

function Avatar({ athlete }) {
  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold text-slate-800 shrink-0"
      style={{ backgroundColor: athlete?.avatar_color || "#E2E8F0" }}
      aria-hidden="true"
    >
      {athlete?.initials || "NA"}
    </div>
  )
}

function AthleteRow({ athlete, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2 flex items-center gap-3 text-left transition active:scale-[0.99] ${
        selected
          ? "border-sky-600 bg-sky-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <Avatar athlete={athlete} />
      <div className="text-sm font-medium text-slate-900 truncate">{fullName(athlete)}</div>
    </button>
  )
}

export default function Dashboard() {
  const [athletes, setAthletes] = useState(() => listAthletes())
  const [activeId, setActiveId] = useState(() => getActiveAthleteId())
  const [showSwitch, setShowSwitch] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState("")

  const activeAthlete = useMemo(
    () => athletes.find((athlete) => athlete.id === activeId) ?? null,
    [athletes, activeId]
  )

  useEffect(() => {
    let cancelled = false

    async function loadAthletes() {
      try {
        const remoteRows = await listAthleteProfiles()
        if (cancelled) return
        replaceAthletes(remoteRows)
        refresh()
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load athletes")
        }
      }
    }

    loadAthletes()
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = () => {
    setAthletes(listAthletes())
    setActiveId(getActiveAthleteId())
  }

  const handleSelectAthlete = (id) => {
    setActiveAthlete(id)
    setShowSwitch(false)
    refresh()
  }

  const handleAddAthlete = async (e) => {
    e.preventDefault()
    setError("")

    try {
      const remote = await createAthleteProfile({ firstName, lastName })
      const created = addAthlete({
        firstName: remote.first_name,
        lastName: remote.last_name || "",
        id: remote.id,
        createdAt: remote.created_at,
        avatarColor: remote.avatar_color || undefined,
      })
      setFirstName("")
      setLastName("")
      setShowAdd(false)
      setActiveAthlete(created.id)
      refresh()
    } catch (err) {
      setError(err?.message || "Unable to add athlete")
    }
  }

  const handleArchiveAthlete = async () => {
    if (!activeAthlete?.id) return
    const ok = window.confirm(`Archive ${fullName(activeAthlete)}?`)
    if (!ok) return
    setError("")

    try {
      await archiveAthleteProfile(activeAthlete.id)
      archiveAthlete(activeAthlete.id)
      setShowSwitch(false)
      refresh()
    } catch (err) {
      setError(err?.message || "Unable to archive athlete")
    }
  }

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-screen-sm mx-auto px-4 py-3">
          <h2 className="screen-title">Dashboard</h2>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto p-4 pb-24 space-y-4">
        <section className="card space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-2xl border border-slate-300 bg-white p-[2px] shadow-sm">
              <div
                className="rounded-[14px] p-[2px]"
                style={{ backgroundColor: activeAthlete?.avatar_color || "#CBD5E1" }}
              >
                <div className="rounded-xl bg-gradient-to-r from-white to-slate-50 px-3 py-2.5 flex items-center gap-3">
                  <Avatar athlete={activeAthlete} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Active athlete</div>
                    <div className="text-sm font-semibold text-slate-900 truncate">{fullName(activeAthlete)}</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="h-10 px-3 rounded-xl border border-sky-300 bg-sky-50 text-sky-700 inline-flex items-center justify-center shadow-sm transition hover:bg-sky-100"
              onClick={() => setShowSwitch((v) => !v)}
              aria-label="Switch athlete"
              title="Switch athlete"
            >
              <ArrowLeftRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            </button>

            <button
              type="button"
              className="h-10 w-10 p-0 rounded-full border-2 border-emerald-600 bg-white text-emerald-600 inline-flex items-center justify-center shadow-sm transition hover:bg-emerald-50"
              onClick={() => setShowAdd((v) => !v)}
              aria-label="Open add athlete"
              title="Add athlete"
            >
              <Plus className="h-5 w-5 shrink-0" strokeWidth={2.5} />
            </button>

            <button
              type="button"
              className="h-10 w-10 p-0 rounded-full border border-amber-500 bg-white text-amber-600 inline-flex items-center justify-center shadow-sm transition hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handleArchiveAthlete}
              aria-label="Archive athlete"
              title="Archive athlete"
              disabled={!activeAthlete}
            >
              <Archive className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            </button>
          </div>

          {showSwitch && (
            <div className="space-y-2" aria-label="Athlete list">
              {athletes.length === 0 && (
                <div className="text-sm text-slate-500">No athlete profiles yet.</div>
              )}
              {athletes.map((athlete) => (
                <AthleteRow
                  key={athlete.id}
                  athlete={athlete}
                  selected={athlete.id === activeId}
                  onClick={() => handleSelectAthlete(athlete.id)}
                />
              ))}
            </div>
          )}

          {showAdd && (
            <form className="space-y-2" onSubmit={handleAddAthlete}>
              <div>
                <label className="label" htmlFor="athlete-first-name">First name</label>
                <input
                  id="athlete-first-name"
                  className="input"
                  value={firstName}
                  maxLength={20}
                  required
                  onChange={(e) => setFirstName(e.target.value.slice(0, 20))}
                />
              </div>
              <div>
                <label className="label" htmlFor="athlete-last-name">Last name (optional)</label>
                <input
                  id="athlete-last-name"
                  className="input"
                  value={lastName}
                  maxLength={20}
                  onChange={(e) => setLastName(e.target.value.slice(0, 20))}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" className="btn btn-blue w-full">Add athlete</button>
            </form>
          )}
        </section>

        <section className="card">
          <p className="text-sm text-slate-600">
            Use the bottom navigation to jump to Practice or Game for this active athlete.
          </p>
        </section>
      </main>
    </div>
  )
}
