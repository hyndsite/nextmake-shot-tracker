import ActionConfirmModal from "./ActionConfirmModal"

export default function PracticeExistingSessionModal({ onCancel, onResume }) {
  return (
    <ActionConfirmModal
      title="Active Session Found"
      body="This athlete already has an active session. Please resume that session instead of starting a new one."
      cancelLabel="Cancel"
      confirmLabel="Resume Existing Session"
      onCancel={onCancel}
      onConfirm={onResume}
      widthClass="w-[90%] max-w-sm"
    />
  )
}
