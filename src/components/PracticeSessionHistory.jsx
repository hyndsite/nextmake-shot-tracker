import { ChevronDown, Trash2 } from "lucide-react"

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString() } catch { return iso || "—" }
}

function dayName(iso) {
  try { return new Date(iso).toLocaleDateString(undefined, { weekday: "long" }) } catch { return "—" }
}

export default function PracticeSessionHistory({
  groupedMonths,
  openMonth,
  setOpenMonth,
  openSession,
  onDelete,
}) {
  return (
    <>
      <h2 className="text-lg font-semibold mb-2">Previous Sessions</h2>

      <div className="space-y-3">
        {groupedMonths.map((month) => (
          <div key={month.key} className="rounded-2xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setOpenMonth(openMonth === month.key ? null : month.key)}
              className="w-full flex items-center justify-between px-3 py-2 accordion-header"
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
              <div className="border-t border-slate-100 p-2 space-y-2">
                {month.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white practice-session-row"
                  >
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => openSession(session.id)}
                      aria-label="Open session"
                    >
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {dayName(session.started_at || session.date_iso)} |{" "}
                        <span className="text-slate-500">
                          {fmtDate(session.started_at || session.date_iso)}
                        </span>
                      </div>
                    </button>
                    <button
                      className="p-1.5 trash-btn"
                      onClick={() => onDelete(session.id)}
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
    </>
  )
}
