import { ArrowLeftRight } from "lucide-react"

function athleteName(athlete) {
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

export default function PracticeStartPanel({
  selectedAthlete,
  athletes,
  selectedAthleteId,
  canStartForSelectedAthlete,
  showSwitchAthlete,
  setShowSwitchAthlete,
  startForSelectedAthlete,
  setSelectedAthleteId,
  setActiveAthlete,
}) {
  return (
    <section className="mb-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-2xl border border-slate-300 bg-white p-[2px] shadow-sm">
          <div
            className="rounded-[14px] p-[2px]"
            style={{ backgroundColor: selectedAthlete?.avatar_color || "#CBD5E1" }}
          >
            <div className="rounded-xl bg-gradient-to-r from-white to-slate-50 px-3 py-2.5 flex items-center gap-3">
              <Avatar athlete={selectedAthlete} />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Active athlete
                </div>
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {athleteName(selectedAthlete)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={startForSelectedAthlete}
          disabled={!canStartForSelectedAthlete}
          className={`h-10 w-10 p-0 rounded-full border-2 inline-flex items-center justify-center shadow-sm transition ${
            canStartForSelectedAthlete
              ? "text-white hover:brightness-95"
              : "text-slate-500 cursor-not-allowed"
          }`}
          style={
            canStartForSelectedAthlete
              ? {
                backgroundColor: "#059669",
                borderColor: "#059669",
                color: "#FFFFFF",
                width: 40,
                height: 40,
                minWidth: 40,
                minHeight: 40,
                borderRadius: 9999,
                padding: 0,
              }
              : {
                backgroundColor: "#E2E8F0",
                borderColor: "#CBD5E1",
                color: "#64748B",
                width: 40,
                height: 40,
                minWidth: 40,
                minHeight: 40,
                borderRadius: 9999,
                padding: 0,
              }
          }
          aria-label="Start session for active athlete"
          title="Start session"
        >
          <span
            className="inline-block"
            style={{
              width: 0,
              height: 0,
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderLeft: canStartForSelectedAthlete ? "10px solid #FFFFFF" : "10px solid #64748B",
              marginLeft: 2,
            }}
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => setShowSwitchAthlete((v) => !v)}
          className="h-10 px-3 rounded-xl border border-sky-300 bg-sky-50 text-sky-700 inline-flex items-center justify-center shadow-sm transition hover:bg-sky-100"
          aria-label="Switch athlete for session"
          title="Switch athlete"
        >
          <ArrowLeftRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
        </button>
      </div>

      {!athletes.length && (
        <div className="text-sm text-slate-500 px-1 mt-2">
          No athlete profiles found. Add one from Dashboard first.
        </div>
      )}

      {showSwitchAthlete && (
        <div className="mt-2 space-y-2" aria-label="Athlete list">
          {athletes.map((athlete) => (
            <button
              key={athlete.id}
              type="button"
              onClick={() => {
                setSelectedAthleteId(athlete.id)
                setActiveAthlete(athlete.id)
                setShowSwitchAthlete(false)
              }}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-medium ${
                athlete.id === selectedAthleteId
                  ? "border-sky-600 bg-sky-50 text-sky-900"
                  : "border-slate-200 bg-white text-slate-800"
              }`}
            >
              {athleteName(athlete)}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
