export default function GameNew({ onStart, onCancel }){
    return (
        <div className="page">
        <h1 className="h1">New Game Setup</h1>
        <div className="card space-y-2">
            <input className="border rounded-lg px-3 py-2 w-full" placeholder="Your Team" />
            <input className="border rounded-lg px-3 py-2 w-full" placeholder="Opponent" />
            <div className="flex gap-2">
            <button className="btn" onClick={onCancel}>Cancel</button>
            <button className="btn btn-primary ml-auto" onClick={onStart}>Start Game</button>
            </div>
        </div>
        </div>
    )
}
  