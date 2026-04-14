import { PlayCircle } from "lucide-react"

export default function GameActiveSessionCard({
  activeGame,
  homeAwayPill,
  onResume,
}) {
  return (
    <section className="section mt-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <PlayCircle className="text-sky-600" size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-slate-900 font-semibold">
            Resume Active Game
          </div>
          <div className="text-sm text-slate-600 truncate">
            {activeGame.team_name} vs {activeGame.opponent_name}
          </div>
          <div className="mt-1">{homeAwayPill(activeGame)}</div>
        </div>
        <div className="shrink-0">
          <button
            type="button"
            onClick={onResume}
            className="btn btn-blue h-9 px-3 rounded-lg text-sm font-semibold"
          >
            Resume
          </button>
        </div>
      </div>
    </section>
  )
}
