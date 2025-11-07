// src/App.jsx
import { useEffect, useState } from "react"

import Login from "./screens/Login"
import ModeGate from "./screens/ModeGate"

import PracticeLog from "./screens/PracticeLog"
import PracticeGate from "./screens/PracticeGate"

import GameGate from "./screens/GameGate"
import GameNew from "./screens/GameNew"
import GameLogger from "./screens/GameLogger"
import GameDetail from "./screens/GameDetail"

import Performance from "./screens/Performance"
import Heatmap from "./screens/Heatmap"
import GoalsManager from "./screens/GoalsManager"
import Account from "./screens/Account"

import BottomNav from "./components/BottomNav"

import { initAutoSync, bootstrapAllData } from "./lib/sync"
import { supabase } from "./lib/supabase"
import { whenIdbReady } from "./lib/idb-init"
import { fixBadHomeAway } from "./lib/game-db"

const LAST_ROUTE_KEY = "nm_last_route"

export default function App() {
  // high-level screen: "login" | "mode" | "app"
  const [screen, setScreen] = useState("login")

  // bootPhase: controls loading while we hydrate from Supabase
  const [bootPhase, setBootPhase] = useState("checking") // "checking" | "bootstrapping" | "ready"

  // active bottom tab
  const [activeTab, setActiveTab] = useState("practice")

  // lightweight routers for practice and game tabs
  const [gameRoute, setGameRoute] = useState({ screen: "gate", params: {} })       // "gate" | "game-new" | "game-logger" | "gameDetail"
  const [practiceRoute, setPracticeRoute] = useState({ screen: "gate", params: {} }) // "gate" | "practice-log"

  // ---------- helpers ----------

  const restoreLastRoute = () => {
    try {
      const raw = localStorage.getItem(LAST_ROUTE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed.activeTab) setActiveTab(parsed.activeTab)
      if (parsed.gameRoute) setGameRoute(parsed.gameRoute)
      if (parsed.practiceRoute) setPracticeRoute(parsed.practiceRoute)
    } catch (err) {
      console.error("[App] restoreLastRoute failed", err)
    }
  }

  // ---------- effects ----------

  // 1) Auto-sync engine (push local dirty → Supabase)
  useEffect(() => {
    (async () => {
      await whenIdbReady()
      initAutoSync()
    })()
  }, [])

  // 2) Normalize any old home_away values for game sessions
  useEffect(() => {
    fixBadHomeAway().catch(() => {})
  }, [])

  // 3) Persist last route (tab + subroutes)
  useEffect(() => {
    const routeState = { activeTab, gameRoute, practiceRoute }
    localStorage.setItem(LAST_ROUTE_KEY, JSON.stringify(routeState))
    // keep legacy nm_active_tab for now
    localStorage.setItem("nm_active_tab", activeTab)
  }, [activeTab, gameRoute, practiceRoute])

  // 4) Auth + bootstrap on app refresh
  useEffect(() => {
    let cancelled = false

    async function init() {
      setBootPhase("checking")
      try {
        const { data } = await supabase.auth.getUser()
        if (cancelled) return

        const user = data?.user ?? null
        if (!user) {
          // no active session → show Login
          setScreen("login")
          setBootPhase("ready")
          return
        }
        // active user → load data, then go to ModeGate instead of auto-entering app
        setBootPhase("bootstrapping")

        try {
          await bootstrapAllData()
        } catch (err) {
          console.error("[App] bootstrapAllData failed", err)
        }

        if (cancelled) return
        restoreLastRoute()
        setBootPhase("ready")

      // Show ModeGate as the first screen after refresh
      setScreen("mode")
      } catch (err) {
        console.error("[App] auth check failed", err)
        if (!cancelled) {
          setScreen("login")
          setBootPhase("ready")
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  // ---------- navigation helpers ----------

  // ModeGate → choose starting tab on first login
  const handleModeSelect = (m) => {
    const tab = m === "game" ? "game" : "practice"
    setActiveTab(tab)
    if (tab === "game") {
      setGameRoute({ screen: "gate", params: {} })
    } else {
      setPracticeRoute({ screen: "gate", params: {} })
    }
    setScreen("app")
  }

  const toModeGate = () => setScreen("mode")

  // Practice-tab navigator (used by PracticeGate / PracticeLog)
  const navPractice = (nextScreen, params = {}) => {
    setPracticeRoute({ screen: nextScreen, params })
    setActiveTab("practice")
  }

  // Game-tab navigator
  const navGame = (nextScreen, params = {}) => {
    setGameRoute({ screen: nextScreen, params })
    setActiveTab("game")
  }

  // BottomNav change → always land on the Gate for that tab
  const handleNavChange = (key) => {
    if (key === "practice") {
      setPracticeRoute({ screen: "gate", params: {} })
    } else if (key === "game") {
      setGameRoute({ screen: "gate", params: {} })
    }
    setActiveTab(key)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem(LAST_ROUTE_KEY)
    setScreen("login")
    setActiveTab("practice")
    setGameRoute({ screen: "gate", params: {} })
    setPracticeRoute({ screen: "gate", params: {} })
  }

  // ---------- render gates ----------

  // 1) No active user → login
  if (screen === "login") {
    return <Login onSuccess={toModeGate} />
  }

  // 2) First-time after login → mode selection
  if (screen === "mode") {
    return <ModeGate onSelect={handleModeSelect} />
  }

  // 3) Authenticated app, but still bootstrapping from Supabase
  if (screen === "app" && bootPhase !== "ready") {
    return (
      <div className="w-full min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-600">Loading your data…</div>
      </div>
    )
  }

  // 4) Normal app
  return (
    <div className="w-full min-h-dvh pb-bottomnav">
      {/* tab content */}
      {activeTab === "practice" && (
        <>
          {practiceRoute.screen === "gate" && <PracticeGate navigate={navPractice} />}
          {practiceRoute.screen === "practice-log" && (
            <PracticeLog
              id={practiceRoute.params?.id}
              started_at={practiceRoute.params?.started_at}
              navigate={navPractice}
            />
          )}
        </>
      )}

      {activeTab === "game" && (
        <>
          {gameRoute.screen === "gate" && <GameGate navigate={navGame} />}
          {gameRoute.screen === "game-new" && <GameNew navigate={navGame} />}
          {gameRoute.screen === "game-logger" && (
            <GameLogger id={gameRoute.params?.id} navigate={navGame} />
          )}
          {gameRoute.screen === "gameDetail" && (
            <GameDetail id={gameRoute.params?.id} navigate={navGame} />
          )}
        </>
      )}

      {activeTab === "progress" && <Performance />}
      {activeTab === "heatmap" && <Heatmap />}
      {activeTab === "goals" && <GoalsManager />}
      {activeTab === "account" && <Account onSignOut={handleSignOut} />}

      {/* bottom nav */}
      <BottomNav activeTab={activeTab} onChange={handleNavChange} />
    </div>
  )
}
