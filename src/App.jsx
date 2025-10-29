import { useEffect, useState } from "react"
import BottomNav from "./components/BottomNav"
import Login from "./screens/Login"
import ModeGate from "./screens/ModeGate"
import PraciteLog from "./screens/PracticeLog"
import GameGate from "./screens/GameGate"
import GameNew from "./screens/GameNew"
import GameLogger from "./screens/GameLogger"
import Performance from "./screens/Performance"
import Heatmap from "./screens/Heatmap"
import GoalsManager from "./screens/GoalsManager"
import Account from "./screens/Account"
import { initAutoSync } from "./lib/sync"

export default function App(){
  const [screen, setScreen] = useState("login") // login | mode | practice | game | game-new | game-logger | performance | heatmap | goals | account
  const [mode, setMode] = useState(localStorage.getItem("nm_mode") || "practice")

  useEffect(()=>{ localStorage.setItem("nm_mode", mode) }, [mode])
  const navTo = (s)=> setScreen(s)

  // basic auth gate (swap with Supabase later)
  useEffect(()=>{
    const authed = localStorage.getItem("nm_authed") === "1"
    setScreen(authed ? "mode" : "login")
  },[])

  return (
    <div className="min-h-dvh">
      {screen === "login" && <Login onSuccess={()=>{localStorage.setItem("nm_authed","1"); navTo("mode")}} />}
      {screen === "mode" && <ModeGate onSelect={(m)=>{ setMode(m); navTo(m==="practice" ? "practice" : "game")}} />}

      {screen === "practice" && <PraciteLog />}
      {screen === "game" && <GameGate onNew={()=>navTo("game-new")} onResume={()=>navTo("game-logger")} />}

      {screen === "game-new" && <GameNew onStart={()=>navTo("game-logger")} onCancel={()=>navTo("game")} />}
      {screen === "game-logger" && <GameLogger onEnd={()=>navTo("game")} />}

      {screen === "performance" && <Performance mode={mode} />}
      {screen === "heatmap" && <Heatmap mode={mode} />}
      {screen === "goals" && <GoalsManager mode={mode} />}
      {screen === "account" && <Account onSignOut={()=>{localStorage.removeItem("nm_authed"); navTo("login")}} />}

      {/* BottomNav hidden on login/mode for a cleaner look */}
      {!(screen==="login"||screen==="mode") && (
        <BottomNav
          active={screen}
          onChange={(s)=>navTo(s)}
          mode={mode}
          onToggleMode={()=>{ const next = mode==="practice"?"game":"practice"; setMode(next); navTo(next==="practice"?"practice":"game") }}
        />
      )}
    </div>
  )
}
