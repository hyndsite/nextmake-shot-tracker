export default function GameExistingSessionModal({
  activeGame,
  fmtDate,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[92%] max-w-sm rounded-2xl bg-white p-4 shadow-xl">
        <div className="text-base font-semibold mb-1">
          Active Game Detected
        </div>
        <p className="text-sm text-slate-600 mb-4">
          An active game session already exists:{" "}
          <span className="font-medium">{activeGame?.team_name}</span> vs{" "}
          <span className="font-medium">{activeGame?.opponent_name}</span> on{" "}
          {fmtDate(activeGame?.started_at)}. Starting a new game will end
          the current one. Do you want to continue?
        </p>
        <div className="flex justify-end gap-2">
          <button
            className="btn btn-blue"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="btn btn-emerald"
            onClick={onConfirm}
          >
            End &amp; Start New
          </button>
        </div>
      </div>
    </div>
  )
}
