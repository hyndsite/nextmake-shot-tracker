export default function BottomNav({ active, onChange, mode, onToggleMode }){
    const Item = ({id,label})=>(
      <button
        onClick={()=>onChange(id)}
        className={`flex-1 py-2 text-xs ${active===id?'text-blue-600 font-semibold':'text-slate-600'}`}
      >{label}</button>
    )
    return (
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
        <div className="max-w-screen-sm mx-auto flex">
          <button onClick={onToggleMode} className="px-3 text-xs text-slate-500">{mode==='practice'?'Practice':'Game'}</button>
          <Item id={mode==='practice'?'practice':'game'} label={mode==='practice'?'Practice':'Game'} />
          <Item id="performance" label="Progress" />
          <Item id="goals" label="Goals" />
          <Item id="heatmap" label="Heatmap" />
          <Item id="account" label="Account" />
        </div>
      </nav>
    )
  }
  