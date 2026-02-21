import React, { useMemo, useState } from "react"
import { ArrowLeftRight } from "lucide-react"

function athleteName(athlete) {
  if (!athlete) return "No active athlete"
  return `${athlete.first_name}${athlete.last_name ? ` ${athlete.last_name}` : ""}`
}

function AthleteAvatar({ athlete }) {
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
      <AthleteAvatar athlete={athlete} />
      <div className="text-sm font-medium text-slate-900 truncate">{athleteName(athlete)}</div>
    </button>
  )
}

export default function ActiveAthleteSwitcher({
  athletes,
  activeAthleteId,
  onSelectAthlete,
}) {
  const [showSwitchAthlete, setShowSwitchAthlete] = useState(false)

  const activeAthlete = useMemo(
    () => athletes.find((athlete) => athlete.id === activeAthleteId) ?? null,
    [athletes, activeAthleteId],
  )

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-2xl border border-slate-300 bg-white p-[2px] shadow-sm">
          <div
            className="rounded-[14px] p-[2px]"
            style={{ backgroundColor: activeAthlete?.avatar_color || "#CBD5E1" }}
          >
            <div className="rounded-xl bg-gradient-to-r from-white to-slate-50 px-3 py-2.5 flex items-center gap-3">
              <AthleteAvatar athlete={activeAthlete} />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Active athlete
                </div>
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {athleteName(activeAthlete)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="h-10 px-3 rounded-xl border border-sky-300 bg-sky-50 text-sky-700 inline-flex items-center justify-center shadow-sm transition hover:bg-sky-100"
          onClick={() => setShowSwitchAthlete((value) => !value)}
          aria-label="Switch athlete"
          title="Switch athlete"
        >
          <ArrowLeftRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
        </button>
      </div>

      {showSwitchAthlete && (
        <div className="space-y-2" aria-label="Athlete list">
          {athletes.length === 0 && (
            <div className="text-sm text-slate-500">No athlete profiles yet.</div>
          )}
          {athletes.map((athlete) => (
            <AthleteRow
              key={athlete.id}
              athlete={athlete}
              selected={athlete.id === activeAthleteId}
              onClick={() => {
                onSelectAthlete?.(athlete.id)
                setShowSwitchAthlete(false)
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}
