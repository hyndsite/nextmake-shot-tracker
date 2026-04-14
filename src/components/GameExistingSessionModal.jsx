import ActionConfirmModal from "./ActionConfirmModal"

export default function GameExistingSessionModal({
  activeGame,
  fmtDate,
  onCancel,
  onConfirm,
}) {
  return (
    <ActionConfirmModal
      title="Active Game Detected"
      body={
        <>
          An active game session already exists:{" "}
          <span className="font-medium">{activeGame?.team_name}</span> vs{" "}
          <span className="font-medium">{activeGame?.opponent_name}</span> on{" "}
          {fmtDate(activeGame?.started_at)}. Starting a new game will end
          the current one. Do you want to continue?
        </>
      }
      cancelLabel="Cancel"
      confirmLabel="End & Start New"
      onCancel={onCancel}
      onConfirm={onConfirm}
      widthClass="w-[92%] max-w-sm"
    />
  )
}
