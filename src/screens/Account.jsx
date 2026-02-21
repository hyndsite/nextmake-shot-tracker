// src/screens/Account.jsx
import { useEffect, useState } from "react"
import {
  addAthlete,
  getActiveAthleteId,
  listAthletes,
  replaceAthletes,
} from "../lib/athlete-db"
import { updateAthleteProfile } from "../lib/athlete-profiles-db"

const LAST_SYNC_KEY = "nm_last_sync" // kept in sync with lib/sync.js
const COLOR_OPTIONS = [
  "#FDE68A",
  "#FBCFE8",
  "#BFDBFE",
  "#C7D2FE",
  "#A7F3D0",
  "#FED7AA",
  "#DDD6FE",
  "#BBF7D0",
]

function fullName(athlete) {
  if (!athlete) return "Unknown athlete"
  return `${athlete.first_name}${athlete.last_name ? ` ${athlete.last_name}` : ""}`
}

function isValidHex(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(String(value || ""))
}

export default function Account({ onSignOut }){
  const [lastSync, setLastSync] = useState(localStorage.getItem(LAST_SYNC_KEY) || null)
  const [online, setOnline] = useState(navigator.onLine)
  const [tab, setTab] = useState("profile")
  const [athletes, setAthletes] = useState(() => listAthletes())
  const [activeAthleteId, setActiveAthleteId] = useState(() => getActiveAthleteId() || "")
  const [editingAthleteId, setEditingAthleteId] = useState(null)
  const [draftFirstName, setDraftFirstName] = useState("")
  const [draftLastName, setDraftLastName] = useState("")
  const [draftColor, setDraftColor] = useState("#BFDBFE")
  const [editError, setEditError] = useState("")

  useEffect(() => {
    // update when other tabs write a newer sync time
    function onStorage(e){
      if(e.key === LAST_SYNC_KEY) setLastSync(e.newValue)
    }
    function onOnline(){ setOnline(true) }
    function onOffline(){ setOnline(false) }

    window.addEventListener("storage", onStorage)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  function startEdit(athlete) {
    setEditingAthleteId(athlete.id)
    setDraftFirstName(athlete.first_name || "")
    setDraftLastName(athlete.last_name || "")
    setDraftColor(athlete.avatar_color || "#BFDBFE")
    setEditError("")
  }

  function cancelEdit() {
    setEditingAthleteId(null)
    setEditError("")
  }

  async function saveAthlete() {
    const first = String(draftFirstName || "").trim()
    const last = String(draftLastName || "").trim()
    const color = String(draftColor || "").trim()

    if (!first) {
      setEditError("First name is required.")
      return
    }
    if (!isValidHex(color)) {
      setEditError("Color must be a valid hex value like #A7F3D0.")
      return
    }

    try {
      const updated = await updateAthleteProfile(editingAthleteId, {
        firstName: first,
        lastName: last,
        avatarColor: color,
      })

      const next = athletes.map((athlete) =>
        athlete.id === editingAthleteId
        ? {
            ...athlete,
            first_name: updated?.first_name ?? first,
            last_name: updated?.last_name ?? last,
            initials:
              updated?.initials ||
              `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase() ||
              "A",
            avatar_color: updated?.avatar_color ?? color,
          }
        : athlete,
      )

      replaceAthletes(next)
      setAthletes(next)
      setEditingAthleteId(null)
      setEditError("")
    } catch (err) {
      setEditError(err?.message || "Unable to save athlete.")
    }
  }

  function handleAddAthlete() {
    try {
      const created = addAthlete({
        firstName: "New",
        lastName: "Athlete",
        avatarColor: "#BFDBFE",
      })
      setAthletes((prev) => [...prev, created])
      setActiveAthleteId(getActiveAthleteId() || activeAthleteId)
      startEdit(created)
    } catch (err) {
      alert(err?.message || "Unable to add athlete.")
    }
  }

  return (
    <div className="page">
      <h1 className="h1">Account</h1>

      <div className="time-pill-group mb-3">
        <button
          type="button"
          onClick={() => setTab("profile")}
          className={"time-pill" + (tab === "profile" ? " time-pill--active" : "")}
        >
          Profile
        </button>
        <button
          type="button"
          onClick={() => setTab("athletes")}
          className={"time-pill" + (tab === "athletes" ? " time-pill--active" : "")}
        >
          Athletes
        </button>
      </div>

      {tab === "profile" && (
        <>
          <div className="card space-y-1">
            <div className="text-sm text-slate-600">Sync status: <span className={online ? "text-green-600" : "text-orange-600"}>{online ? "Online" : "Offline"}</span></div>
            <div className="text-sm text-slate-600">Last sync: {lastSync ? new Date(lastSync).toLocaleString() : "—"}</div>
            <div className="text-xs text-slate-500">All changes sync automatically when online.</div>
          </div>
          <button className="btn w-full" onClick={onSignOut}>Sign Out</button>
        </>
      )}

      {tab === "athletes" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Athlete Profiles</h2>
            <button
              type="button"
              onClick={handleAddAthlete}
              className="h-9 rounded-lg border border-sky-300 bg-sky-50 px-3 text-sm font-semibold text-sky-700"
            >
              Add Athlete
            </button>
          </div>

          {athletes.map((athlete) => {
            const isEditing = athlete.id === editingAthleteId
            const name = fullName(athlete)
            return (
              <section key={athlete.id} className="card space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold text-slate-800 shrink-0"
                      style={{ backgroundColor: athlete.avatar_color || "#E2E8F0" }}
                    >
                      {athlete.initials || "NA"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{name}</div>
                      {athlete.id === activeAthleteId && (
                        <div className="text-[11px] text-sky-700 font-medium">Active athlete</div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => (isEditing ? cancelEdit() : startEdit(athlete))}
                    className="h-8 rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-700"
                    aria-label={`Edit ${name}`}
                  >
                    {isEditing ? "Close" : "Edit"}
                  </button>
                </div>

                {isEditing && (
                  <div className="space-y-2 border-t border-slate-200 pt-2">
                    <div>
                      <label htmlFor="athlete-first-name" className="block text-xs font-medium text-slate-700 mb-1">
                        First name
                      </label>
                      <input
                        id="athlete-first-name"
                        type="text"
                        value={draftFirstName}
                        onChange={(e) => setDraftFirstName(e.target.value)}
                        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="athlete-last-name" className="block text-xs font-medium text-slate-700 mb-1">
                        Last name
                      </label>
                      <input
                        id="athlete-last-name"
                        type="text"
                        value={draftLastName}
                        onChange={(e) => setDraftLastName(e.target.value)}
                        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="athlete-color" className="block text-xs font-medium text-slate-700 mb-1">
                        Athlete color
                      </label>
                      <input
                        id="athlete-color"
                        type="text"
                        value={draftColor}
                        onChange={(e) => setDraftColor(e.target.value)}
                        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Choose color ${color}`}
                          onClick={() => setDraftColor(color)}
                          className="h-6 w-6 rounded-full border border-slate-300"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

                    <div className="rounded-xl border border-slate-300 p-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Preview
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        <span
                          className="inline-flex h-4 w-4 rounded-full align-middle mr-2"
                          style={{ backgroundColor: draftColor }}
                        />
                        {String(draftFirstName || "").trim() || "First"} {String(draftLastName || "").trim()}
                      </div>
                    </div>

                    {editError && (
                      <div className="text-xs text-red-600">{editError}</div>
                    )}

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveAthlete}
                        className="btn btn-blue h-9 rounded-lg px-3 text-sm font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
