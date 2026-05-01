// src/screens/PracticeGate.jsx
import PracticeExistingSessionModal from "../components/PracticeExistingSessionModal"
import PracticeGateStartSection from "../components/PracticeGateStartSection"
import PracticeSessionHistory from "../components/PracticeSessionHistory"
import { usePracticeGateScreen } from "../hooks/usePracticeGateScreen"

export default function PracticeGate({ navigate }) {
  const {
    data,
    startUi,
    historyUi,
    modal,
    startActions,
    historyActions,
    modalActions,
  } = usePracticeGateScreen({ navigate })

  return (
    <div className="page p-3 pb-20 max-w-screen-sm mx-auto">
      <h2 className="screen-title">Practice Sessions</h2>

      <PracticeGateStartSection
        athleteData={data}
        startUi={startUi}
        startActions={startActions}
      />

      <PracticeSessionHistory
        groupedMonths={data.groupedMonths}
        openMonth={historyUi.openMonth}
        setOpenMonth={historyActions.toggleMonth}
        openSession={historyActions.openSession}
        onDelete={historyActions.deleteSession}
      />

      {/* Existing active session modal */}
      {modal.existingActiveSession && (
        <PracticeExistingSessionModal
          onCancel={modalActions.dismissExistingSession}
          onResume={modalActions.resumeExistingSession}
        />
      )}
    </div>
  )
}
