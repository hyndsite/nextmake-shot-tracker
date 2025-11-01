import React, { useEffect, useState } from "react";
import { endGameSession, getActiveGameSession } from "../lib/game-db"; // endGameSession(id) exists; getActiveGameSession is optional
import { PlayCircle } from "lucide-react";

export default function GameLogger({ id, navigate }) {
  const [game, setGame] = useState(null);
  const gameId = id ?? game?.id;

  useEffect(() => {
    let mounted = true;
    (async () => {
      // If an id was provided, you likely load it from your DB here
      // For now, try to use active game as a fallback
      if (!id && getActiveGameSession) {
        const g = await getActiveGameSession();
        if (mounted) setGame(g);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  async function onEndGame() {
    if (!gameId) return;
    const ok = window.confirm("End this game and return to Game Center?");
    if (!ok) return;
    await endGameSession(gameId);
    // Navigate back to the GameGate
    navigate?.("gate");
  }

  return (
    <div className="px-4 pt-3 pb-24 max-w-screen-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold text-slate-900">Game Logger</h1>
        <button
          type="button"
          onClick={onEndGame}
          className="btn btn-danger h-9 px-3 text-sm font-semibold"
        >
          End Game
        </button>
      </div>

      {/* Context / meta (optional) */}
      {game && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 mb-3">
          <div className="text-sm text-slate-600">
            {game.team_name} vs {game.opponent_name} • {game.home_away === "home" ? "Home" : "Away"}
          </div>
        </div>
      )}

      {/* --- Your live logging UI goes here --- */}
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
        <PlayCircle className="mx-auto mb-2" />
        <div>Live event logging coming here…</div>
      </div>
    </div>
  );
}
