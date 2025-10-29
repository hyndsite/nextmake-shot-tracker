export default function ModeGate({ onSelect }){
    return (
      <div className="page">
        <h1 className="h1">Choose Mode</h1>
        <div className="card">
          <button className="btn btn-primary w-full mb-2" onClick={()=>onSelect('practice')}>Practice Mode</button>
          <button className="btn w-full" onClick={()=>onSelect('game')}>Game Mode</button>
        </div>
      </div>
    )
  }
  