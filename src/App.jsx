import { useEffect, useState } from "react"

import Login from "./screens/Login"
import ModeGate from "./screens/ModeGate"

import PracticeLog from "./screens/PracticeLog"

import GameGate from "./screens/GameGate"
import GameNew from "./screens/GameNew"
import GameLogger from "./screens/GameLogger"
// import GameDetail from "./screens/GameDetail" // (add when ready)

import Performance from "./screens/Performance"
import Heatmap from "./screens/Heatmap"
import GoalsManager from "./screens/GoalsManager"
import Account from "./screens/Account"

import BottomNav from "./components/BottomNav"

import { initAutoSync } from "./lib/sync"
import { supabase } from "./lib/supabase"

export default function App() {
  // high-level screen: "login" | "mode" | "app"
  const [screen, setScreen] = useState("login")

  // active bottom tab (BottomNav keys)
  const [activeTab, setActiveTab] = useState(
    localStorage.getItem("nm_active_tab") || "practice"
  )

  // lightweight router for the Game tab
  // screen: "gate" | "game-new" | "game-logger" | "game-detail"
  const [gameRoute, setGameRoute] = useState({ screen: "gate", params: {} })

  // ---------- effects ----------
  // 1) Auto-sync engine
  useEffect(() => { initAutoSync() }, [])

  // 2) Persist the tab
  useEffect(() => {
    localStorage.setItem("nm_active_tab", activeTab)
  }, [activeTab])

  // 3) Supabase auth → app/login
  useEffect(() => {
    let mounted = true
    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setScreen(data?.session ? "app" : "login")
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setScreen(session ? "app" : "login")
    })
    init()
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  // ---------- navigation helpers ----------
  const toModeGate = () => setScreen("mode")

  // ModeGate → choose starting tab (practice|game)
  const handleModeSelect = (m) => {
    setActiveTab(m === "practice" ? "practice" : "game")
    if (m === "game") setGameRoute({ screen: "gate", params: {} })
    setScreen("app")
  }

  // BottomNav change
  const handleNavChange = (key) => {
    setActiveTab(key)
    if (key === "game") {
      // whenever we land on Game, default to the gate
      setGameRoute((r) => (r.screen ? r : { screen: "gate", params: {} }))
    }
  }

  // Game-tab navigator passed down to Game screens
  const navGame = (nextScreen, params = {}) => {
    // allow Game screens to change the route among themselves
    setGameRoute({ screen: nextScreen, params })
    // ensure we are on the Game tab
    setActiveTab("game")
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setScreen("login")
  }

  // ---------- render ----------
  if (screen === "login") {
    return <Login onSuccess={toModeGate} />
  }

  if (screen === "mode") {
    return <ModeGate onSelect={handleModeSelect} />
  }

  // screen === "app"
  return (
    <div className="min-h-dvh pb-bottomnav">
      {/* tab content */}
      {activeTab === "practice" && <PracticeLog />}

      {activeTab === "game" && (
        <>
          {gameRoute.screen === "gate" && <GameGate navigate={navGame} />}
          {gameRoute.screen === "game-new" && <GameNew navigate={navGame} />}
          {gameRoute.screen === "game-logger" && (
            <GameLogger id={gameRoute.params?.id} navigate={navGame} />
          )}
          {/* {gameRoute.screen === "game-detail" && (
            <GameDetail id={gameRoute.params?.id} navigate={navGame} />
          )} */}
        </>
      )}

      {activeTab === "progress" && <Performance />}
      {activeTab === "heatmap" && <Heatmap />}
      {activeTab === "goals" && <GoalsManager />}
      {activeTab === "account" && <Account onSignOut={handleSignOut} />}

      {/* bottom nav (not shown on login/mode) */}
      <BottomNav activeTab={activeTab} onChange={handleNavChange} />
    </div>
  )
}
