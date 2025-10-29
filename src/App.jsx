import { useEffect, useState } from "react"

// Screens
import Login from "./screens/Login"
import ModeGate from "./screens/ModeGate"
import PracticeLog from "./screens/PracticeLog"   // make sure this file exists (no typo)
import GameGate from "./screens/GameGate"
import GameNew from "./screens/GameNew"
import GameLogger from "./screens/GameLogger"
import Performance from "./screens/Performance"
import Heatmap from "./screens/Heatmap"
import GoalsManager from "./screens/GoalsManager"
import Account from "./screens/Account"

// Components
import BottomNav from "./components/BottomNav"

// Auto-sync (no manual buttons)
import { initAutoSync } from "./lib/sync"

export default function App(){
  // Screens: login | mode | practice | game | game-new | game-logger | performance | heatmap | goals | account
  const [screen, setScreen] = useState("login")
  const [mode, setMode] = useState(localStorage.getItem("nm_mode") || "practice")

  const navTo = (s) => setScreen(s)

  // 🟢 1) Initialize the auto-sync service ONCE on mount
  useEffect(() => {
    initAutoSync()
  }, [])

  // 💾 2) Persist selected mode locally so we remember user preference
  useEffect(() => {
    localStorage.setItem("nm_mode", mode)
  }, [mode])

  // 🔐 3) Simple auth gate (placeholder until Supabase auth is wired)
  useEffect(() => {
    const authed = localStorage.getItem("nm_authed") === "1"
    setScreen(authed ? "mode" : "login")
  }, [])

  // Helpers
  const handleLoginSuccess = () => {
    localStorage.setItem("nm_authed", "1")
    navTo("mode")
  }

  const handleSignOut = () => {
    localStorage.removeItem("nm_authed")
    navTo("login")
  }

  const toggleMode = () => {
    const next = mode === "practice" ? "game" : "practice"
    setMode(next)
    navTo(next === "practice" ? "practice" : "game")
  }

  return (
    <div className="min-h-dvh">
      {/* Top-level screen router */}
      {screen === "login"        && <Login onSuccess={handleLoginSuccess} />}
      {screen === "mode"         && (
        <ModeGate
          onSelect={(m) => {
            setMode(m)
            navTo(m === "practice" ? "practice" : "game")
          }}
        />
      )}

      {/* Practice flow */}
      {screen === "practice"     && <PracticeLog />}

      {/* Game flow */}
      {screen === "game"         && (
        <GameGate
          onNew={() => navTo("game-new")}
          onResume={() => navTo("game-logger")}
        />
      )}
      {screen === "game-new"     && (
        <GameNew
          onStart={() => navTo("game-logger")}
          onCancel={() => navTo("game")}
        />
      )}
      {screen === "game-logger"  && <GameLogger onEnd={() => navTo("game")} />}

      {/* Analytics / Goals / Account */}
      {screen === "performance"  && <Performance mode={mode} />}
      {screen === "heatmap"      && <Heatmap mode={mode} />}
      {screen === "goals"        && <GoalsManager mode={mode} />}
      {screen === "account"      && <Account onSignOut={handleSignOut} />}

      {/* Bottom nav hidden on login/mode screens */}
      {!(screen === "login" || screen === "mode") && (
        <BottomNav
          active={screen}
          mode={mode}
          onToggleMode={toggleMode}
          onChange={(s) => navTo(s)}
        />
      )}
    </div>
  )
}
