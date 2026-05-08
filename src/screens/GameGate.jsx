// src/screens/GameGate.jsx
import ActionConfirmModal from "../components/ActionConfirmModal"
import GameExistingSessionModal from "../components/GameExistingSessionModal"
import GameGateStartSection from "../components/GameGateStartSection"
import GameHistorySection from "../components/GameHistorySection"
import { useGameGateScreen } from "../hooks/useGameGateScreen.jsx"

export default function GameGate({ navigate }) {
  const {
    data,
    startUi,
    modal,
    display,
    startActions,
    modalActions,
    historyActions,
  } = useGameGateScreen({ navigate })

  // ---------- render ----------
  return (
    <div className="page">
      <h2 className="screen-title">Game Center</h2>

      <GameGateStartSection
        activeGame={data.active}
        homeAwayPill={display.homeAwayPill}
        startActions={startActions}
      />

      <GameHistorySection
        groupedPrev={data.groupedPrev}
        computeResultSummary={display.computeResultSummary}
        fmtDate={display.fmtDate}
        homeAwayPill={display.homeAwayPill}
        openDetail={historyActions.openDetail}
        onDelete={historyActions.requestDeleteGame}
      />

      {/* Confirm new (active exists) */}
      {startUi.showConfirmNew && (
        <GameExistingSessionModal
          activeGame={data.active}
          fmtDate={display.fmtDate}
          onCancel={modalActions.dismissConfirmNew}
          onConfirm={modalActions.confirmEndAndStart}
        />
      )}

      {modal.pendingDeleteGameId && (
        <ActionConfirmModal
          title="Delete Game"
          body={`Delete ${modal.pendingDeleteGameLabel}? This cannot be undone.`}
          cancelLabel="Cancel"
          confirmLabel="Delete Game"
          onCancel={modalActions.dismissDeleteGame}
          onConfirm={modalActions.confirmDeleteGame}
          widthClass="w-[90%] max-w-sm"
        />
      )}
    </div>
  )
}
