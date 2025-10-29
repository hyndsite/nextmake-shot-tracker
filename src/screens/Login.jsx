export default function Login({ onSuccess }){
    function fakeLogin(e){ e.preventDefault(); onSuccess() }
    return (
      <div className="page">
        <h1 className="h1">Login</h1>
        <p className="text-sm text-slate-600 mb-4">Magic link (Supabase) coming next; using local fake login for now.</p>
        <form onSubmit={fakeLogin} className="card">
          <input required placeholder="Email" className="border rounded-lg px-3 py-2 w-full mb-2" />
          <button className="btn btn-primary w-full">Send Link</button>
        </form>
      </div>
    )
  }
  