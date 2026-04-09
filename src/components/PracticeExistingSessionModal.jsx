export default function PracticeExistingSessionModal({ onCancel, onResume }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[90%] max-w-sm rounded-2xl bg-white p-4 shadow-xl">
        <div className="text-base font-semibold mb-1">Active Session Found</div>
        <p className="text-sm text-slate-600 mb-4">
          This athlete already has an active session. Please resume that session instead of starting a new one.
        </p>
        <div className="flex justify-end gap-2">
          <button className="btn btn-blue" onClick={onCancel}>Cancel</button>
          <button className="btn btn-emerald" onClick={onResume}>Resume Existing Session</button>
        </div>
      </div>
    </div>
  )
}
