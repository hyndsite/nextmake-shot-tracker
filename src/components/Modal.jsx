export default function Modal({ open, onClose, children }){
  if(!open) return null
  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-4">
        {children}
        <div className="text-right mt-3">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
