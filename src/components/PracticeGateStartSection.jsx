import { PlayCircle } from "lucide-react"

import PracticeStartPanel from "./PracticeStartPanel"

export default function PracticeGateStartSection({
  athleteData,
  startUi,
  startActions,
}) {
  const { active } = athleteData
  const { chooserRef, showStartCard } = startUi
  const {
    openStartCard,
    resumeActive,
  } = startActions

  return (
    <>
      {!showStartCard && (
        <button
          type="button"
          onClick={openStartCard}
          className="w-full btn btn-blue h-11 rounded-xl font-semibold flex items-center justify-center gap-2 mb-2"
        >
          <PlayCircle size={18} /> Start New Session
        </button>
      )}

      {showStartCard && (
        <div ref={chooserRef}>
          <PracticeStartPanel
            athleteData={athleteData}
            startUi={startUi}
            startActions={startActions}
          />
        </div>
      )}

      <button
        type="button"
        onClick={resumeActive}
        disabled={!active}
        className={`w-full h-11 rounded-xl font-semibold flex items-center justify-center gap-2 mb-4
          ${active ? "btn btn-blue" : "btn btn-disabled"}`}
      >
        <PlayCircle size={18} /> Resume Active Session
      </button>
    </>
  )
}
