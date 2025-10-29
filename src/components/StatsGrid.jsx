export default function StatsGrid({ items=[] }){
    return (
      <div className="grid grid-cols-3 gap-2">
        {items.map((it,i)=>(
          <div key={i} className="rounded-lg border p-3 text-center">
            <div className="text-xs text-slate-500">{it.label}</div>
            <div className="text-lg font-semibold">{it.value}</div>
          </div>
        ))}
      </div>
    )
  }
  