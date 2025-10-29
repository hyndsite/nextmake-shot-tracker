import { useEffect, useState } from "react"
import Login from "./screens/Login"
import ModeGate from "./screens/ModeGate"
import PracticeLog from "./screens/PracticeLog"
import GameGate from "./screens/GameGate"
import GameNew from "./screens/GameNew"
import GameLogger from "./screens/GameLogger"
import Performance from "./screens/Performance"
import Heatmap from "./screens/Heatmap"
import GoalsManager from "./screens/GoalsManager"
import Account from "./screens/Account"
import BottomNav from "./components/BottomNav"
import { initAutoSync } from "./lib/sync"
import { supabase } from "./lib/supabase"

export default function App(){
  const [screen, setScreen] = useState("login")
  const [mode, setMode] = useState(localStorage.getItem("nm_mode") || "practice")
  const navTo = (s)=> setScreen(s)

  // 1) Auto-sync engine
  useEffect(()=>{ initAutoSync() }, [])

  // 2) Persist mode
  useEffect(()=>{ localStorage.setItem("nm_mode", mode) }, [mode])

  // 3) Supabase auth → screen
  useEffect(()=>{
    let mounted = true
    async function init(){
      const { data } = await supabase.auth.getSession()
      if(!mounted) return
      setScreen(data?.session ? "mode" : "login")
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session)=>{
      setScreen(session ? "mode" : "login")
    })
    init()
    return () => { mounted=false; sub.subscription.unsubscribe() }
  },[])

  const handleLoginSuccess = ()=> navTo("mode")
  const handleSignOut = async ()=>{
    await supabase.auth.signOut()
    navTo("login")
  }
  const toggleMode = ()=>{
    const next = mode === "practice" ? "game" : "practice"
    setMode(next)
    navTo(next === "practice" ? "practice" : "game")
  }

  return (
    <div className="min-h-dvh">
      {screen==="login" && <Login onSuccess={handleLoginSuccess} />}
      {screen==="mode"  && <ModeGate onSelect={(m)=>{ setMode(m); navTo(m==="practice"?"practice":"game") }} />}

      {screen==="practice"    && <PracticeLog />}
      {screen==="game"        && <GameGate onNew={()=>navTo("game-new")} onResume={()=>navTo("game-logger")} />}
      {screen==="game-new"    && <GameNew onStart={()=>navTo("game-logger")} onCancel={()=>navTo("game")} />}
      {screen==="game-logger" && <GameLogger onEnd={()=>navTo("game")} />}

      {screen==="performance" && <Performance mode={mode} />}
      {screen==="heatmap"     && <Heatmap mode={mode} />}
      {screen==="goals"       && <GoalsManager mode={mode} />}
      {screen==="account"     && <Account onSignOut={handleSignOut} />}

      {!(screen==="login"||screen==="mode") && (
        <BottomNav
          active={screen}
          mode={mode}
          onToggleMode={toggleMode}
          onChange={(s)=>navTo(s)}
        />
      )}
    </div>
  )
}
