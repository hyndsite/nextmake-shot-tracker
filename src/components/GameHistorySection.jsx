import { useEffect, useState } from "react"
import { Gamepad2, Trash2 } from "lucide-react"
import AccordionSection from "./ui/AccordionSection"

export default function GameHistorySection({
  groupedPrev,
  computeResultSummary,
  fmtDate,
  homeAwayPill,
  openDetail,
  onDelete,
}) {
  const [openGroups, setOpenGroups] = useState(() => new Set(groupedPrev.keys()))

  useEffect(() => {
    setOpenGroups(new Set(groupedPrev.keys()))
  }, [groupedPrev])

  function toggleGroup(group) {
    setOpenGroups((current) => {
      const next = new Set(current)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  return (
    <>
      <h2 className="mt-5 text-slate-900 font-semibold text-center">
        Previous Games
      </h2>

      {[...groupedPrev.entries()].map(([group, rows]) => (
        <AccordionSection
          key={group}
          title={group}
          open={openGroups.has(group)}
          onToggle={() => toggleGroup(group)}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white"
          contentClassName="space-y-2 border-t border-slate-100 p-2"
        >
          {rows.map((game) => {
            const result = computeResultSummary(game)
            return (
              <div
                key={game.id}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(game.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    openDetail(game.id)
                  }
                }}
                className="w-full text-left rounded-2xl border border-slate-200 bg-white px-3 py-2.5
                           flex items-center gap-3 hover:bg-slate-50 active:scale-[0.995]
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                aria-label={`${game.team_name} vs ${
                  game.opponent_name
                } on ${fmtDate(game.date_iso || game.started_at)}`}
              >
                <div className="shrink-0 mt-0.5">
                  <Gamepad2 size={18} className="text-slate-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-500">
                    {fmtDate(game.date_iso || game.started_at)}
                  </div>
                  <div className="truncate text-slate-900 font-medium">
                    {game.team_name} vs. {game.opponent_name}
                  </div>

                  <div className="mt-1 flex items-center gap-3">
                    <div>{homeAwayPill(game)}</div>
                    {result && (
                      <div className="text-xs font-medium text-slate-700 text-right">
                        {result.letter} | {result.team} - {result.opp}
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  <button
                    type="button"
                    onClick={(e) => onDelete(game.id, e)}
                    className="trash-btn"
                    aria-label="Delete game"
                  >
                    <Trash2 size={18} className="text-red-600" />
                  </button>
                </div>
              </div>
            )
          })}
        </AccordionSection>
      ))}
    </>
  )
}
