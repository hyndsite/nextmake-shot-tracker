export default function GameLogger({ onEnd }){
    return (
      <div className="page">
        <h1 className="h1">Game Shot Logger</h1>
        <div className="card">[Half-court tap zones + shot modal]</div>
        <div className="card">Quick: Assist · Rebound · Steal · Free Throw</div>
        <button className="btn w-full" onClick={onEnd}>End Game</button>
      </div>
    )
  }
  