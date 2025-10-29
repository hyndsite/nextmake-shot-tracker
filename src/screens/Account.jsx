// src/screens/Account.jsx
import { useEffect, useState } from "react"

const LAST_SYNC_KEY = "nm_last_sync" // kept in sync with lib/sync.js

export default function Account({ onSignOut }){
  const [lastSync, setLastSync] = useState(localStorage.getItem(LAST_SYNC_KEY) || null)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    // update when other tabs write a newer sync time
    function onStorage(e){
      if(e.key === LAST_SYNC_KEY) setLastSync(e.newValue)
    }
    function onOnline(){ setOnline(true) }
    function onOffline(){ setOnline(false) }

    window.addEventListener("storage", onStorage)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  return (
    <div className="page">
      <h1 className="h1">Account</h1>

      <div className="card space-y-1">
        <div className="text-sm text-slate-600">Sync status: <span className={online ? "text-green-600" : "text-orange-600"}>{online ? "Online" : "Offline"}</span></div>
        <div className="text-sm text-slate-600">Last sync: {lastSync ? new Date(lastSync).toLocaleString() : "—"}</div>
        <div className="text-xs text-slate-500">All changes sync automatically when online.</div>
      </div>

      <button className="btn w-full" onClick={onSignOut}>Sign Out</button>
    </div>
  )
}
