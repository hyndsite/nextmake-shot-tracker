// src/screens/Account.jsx
import { useState } from "react"
import { syncAll } from "../lib/sync"

export default function Account({ onSignOut }){
  const [msg,setMsg] = useState("")
  async function doSync(){
    setMsg("Syncing…")
    try{
      const res = await syncAll()
      setMsg(`Pushed ${res.pushed}, Pulled ${res.pulled}`)
    }catch(e){
      setMsg(`Sync error: ${e.message}`)
    }
  }
  return (
    <div className="page">
      <h1 className="h1">Account</h1>
      <div className="card">User info · Last sync</div>
      <div className="flex gap-2">
        <button className="btn" onClick={doSync}>Sync Now</button>
        <button className="btn" onClick={onSignOut}>Sign Out</button>
      </div>
      {msg && <p className="text-xs text-slate-500 mt-2">{msg}</p>}
    </div>
  )
}
