import { PlayCircle } from "lucide-react"

import GameActiveSessionCard from "./GameActiveSessionCard"

export default function GameGateStartSection({
  activeGame,
  homeAwayPill,
  startActions,
}) {
  return (
    <>
      <button
        type="button"
        onClick={startActions.startNew}
        className="btn btn-blue w-full h-12 rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
      >
        <PlayCircle size={20} className="stroke-[2.25]" />
        Start New Game
      </button>

      {activeGame && (
        <GameActiveSessionCard
          activeGame={activeGame}
          homeAwayPill={homeAwayPill}
          onResume={startActions.resumeActive}
        />
      )}
    </>
  )
}
