import { useLoginFlow } from "../hooks/useLoginFlow"

export default function Login({ onSuccess }) {
  const {
    email,
    msg,
    inputRef,
    sendLink,
    setEmail,
    status,
    checkSession,
  } = useLoginFlow({ onSuccess })

  return (
    <div className="min-h-dvh flex items-center justify-center bg-white">
      <div className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white font-bold">NM</div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Sign in to NextMake</h1>
          <p className="mt-1 text-sm text-slate-600">Track practice and games—auto-sync included.</p>
        </div>

        <form onSubmit={sendLink} className="card space-y-3">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            ref={inputRef}
            className="input"
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
            required
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="email"
            inputMode="email"
          />
          <button className="btn btn-blue w-full" disabled={status === "sending"}>
            {status === "sending" ? "Sending magic link…" : "Send magic link"}
          </button>
          {msg && (
            <p className={status === "err" ? "text-sm text-red-600" : "text-sm text-slate-600"}>
              {msg}
            </p>
          )}
        </form>

        <div className="mt-3 text-center">
          <button className="btn btn-blue text-sm" onClick={checkSession}>I clicked the link</button>
        </div>
      </div>
    </div>
  )
}
