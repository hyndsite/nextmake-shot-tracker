export default function ActionConfirmModal({
  title,
  body,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
  widthClass = "w-[90%] max-w-sm",
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className={`${widthClass} rounded-2xl bg-white p-4 shadow-xl`}>
        <div className="text-base font-semibold mb-1">{title}</div>
        <div className="text-sm text-slate-600 mb-4">{body}</div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-blue" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn btn-emerald" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
