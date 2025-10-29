export default function GameGate({ onNew, onResume }){
    return (
      <div className="page">
        <h1 className="h1">Game Mode Hub</h1>
        <div className="card">
          <button className="btn btn-primary w-full mb-2" onClick={onNew}>New Game</button>
          <button className="btn w-full" onClick={onResume}>Resume Game</button>
        </div>
        <div className="card">Previous Games (list)</div>
      </div>
    )
  }
  