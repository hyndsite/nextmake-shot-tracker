// src/screens/Login.jsx
import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function Login({ onSuccess }){
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("idle") // idle | sending | sent | err
  const [msg, setMsg] = useState("")

  async function sendLink(e){
    e.preventDefault()
    setStatus("sending"); setMsg("")
    const { error } = await supabase.auth.signInWithOtp({ email })
    if(error){ setStatus("err"); setMsg(error.message); return }
    setStatus("sent"); setMsg("Magic link sent. Check your email and return here.")
  }

  // If the user already has a session (came back from magic link), call onSuccess
  async function checkSession(){
    const { data } = await supabase.auth.getSession()
    if(data?.session){ onSuccess?.() }
  }

  return (
    <div className="page">
      <h1 className="h1">Login</h1>
      <form onSubmit={sendLink} className="card space-y-2">
        <input
          type="email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          placeholder="you@example.com"
          className="border rounded-lg px-3 py-2 w-full"
          required
        />
        <button className="btn btn-primary w-full" disabled={status==="sending"}>
          {status==="sending" ? "Sending…" : "Send Magic Link"}
        </button>
        {msg && <p className={`text-sm ${status==="err"?"text-red-600":"text-slate-600"}`}>{msg}</p>}
      </form>

      <div className="card">
        <button className="btn w-full" onClick={checkSession}>I clicked the link</button>
      </div>
    </div>
  )
}
