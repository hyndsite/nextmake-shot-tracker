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
    setStatus("sent"); setMsg("Magic link sent. Check your email, then return here.")
  }

  async function checkSession(){
    const { data } = await supabase.auth.getSession()
    if(data?.session) onSuccess?.()
    else { setStatus("err"); setMsg("No active session yet. Click the magic link, then tap this again.") }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-white">
      <div className="w-full max-w-sm p-6">
        {/* Brand / Title */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-sky-600 text-white text-lg font-bold select-none">
            NM
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Sign in to NextMake</h1>
          <p className="mt-1 text-sm text-slate-600">Track practice and games—auto-sync included.</p>
        </div>

        {/* Card */}
        <form onSubmit={sendLink} className="card space-y-3">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={(e)=>setEmail(e.target.value)}
            required
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="email"
          />
          <button className="btn btn-primary w-full" disabled={status==="sending"}>
            {status==="sending" ? "Sending magic link…" : "Send magic link"}
          </button>
          {msg && (
            <p className={`help ${status==="err" ? "text-red-600" : "text-slate-600"}`}>
              {msg}
            </p>
          )}
        </form>

        {/* Secondary actions */}
        <div className="mt-3 text-center">
          <button className="btn btn-ghost text-sm" onClick={checkSession}>I clicked the link</button>
        </div>

        {/* Legal / footer */}
        <p className="mt-6 text-center help">
          By continuing you agree to our Terms & Privacy.
        </p>
      </div>
    </div>
  )
}
