// src/screens/GameGate.jsx
import GameExistingSessionModal from "../components/GameExistingSessionModal"
import GameGateStartSection from "../components/GameGateStartSection"
import GameHistorySection from "../components/GameHistorySection"
import { useGameGateScreen } from "../hooks/useGameGateScreen.jsx"

export default function GameGate({ navigate }) {
  const {
    data,
    startUi,
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
        onDelete={historyActions.deleteGame}
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
    </div>
  )
}
