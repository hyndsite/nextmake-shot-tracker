import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  endGameSession,
  getGameSession,
  listGameEventsBySession,
  addGameEvent,
} from "../lib/game-db"
import ZONES from "../constants/zones"                 // [{id, name, isThree}, ...]
import { ZONE_ANCHORS } from "../constants/zoneAnchors" // { zoneId: {x,y}, ... }
import SHOT_TYPES from "../constants/shotTypes"         // [{id,label}, ...]
import { X, Target, Hand, Plus } from "lucide-react"
import { MdSportsBasketball } from "react-icons/md"
/**
 * Assumptions:
 * - Court image path: /images/court-half.svg   (adjust if your asset lives elsewhere)
 * - addGameEvent persists `{ mode: "game", ... }`
 * - listGameEventsBySession(gameId) returns all events for this game
 */

export default function GameLogger({ id: gameId, navigate }) {
  const [game, setGame] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [shotModal, setShotModal] = useState(null) // { zoneId, isThree, shotType, pressured }
  const [ftModalOpen, setFtModalOpen] = useState(false)

  // Court sizing
  const imgRef = useRef(null)
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 })

  // Build a quick zone lookup map
  const zoneMap = useMemo(() => {
    const m = new Map()
    ZONES.forEach(z => m.set(z.id, z))
    return m
  }, [])

  // Derive the base coordinate system from the anchors themselves
  const BASE = useMemo(() => {
    let maxX = 1, maxY = 1
    for (const a of Object.values(ZONE_ANCHORS)) {
      if (a.x > maxX) maxX = a.x
      if (a.y > maxY) maxY = a.y
    }
    return { w: maxX, h: maxY }
  }, [])

  // Scale factors from base anchor space to rendered image
  const scale = useMemo(() => ({
    kx: imgSize.w / BASE.w,
    ky: imgSize.h / BASE.h,
  }), [imgSize, BASE])

  // Load game + events
  async function refresh() {
    setLoading(true)
    const [g, ev] = await Promise.all([
      getGameSession(gameId),
      listGameEventsBySession(gameId),
    ])
    setGame(g)
    setEvents(ev || [])
    setLoading(false)
  }
  useEffect(() => { void refresh() }, [gameId])

  // Track rendered size for scaling anchors
  useEffect(() => {
    const el = imgRef.current
    if (!el) return
    const sync = () => {
      const r = el.getBoundingClientRect()
      setImgSize({ w: r.width, h: r.height })
    }
    sync()
    window.addEventListener("resize", sync)
    return () => window.removeEventListener("resize", sync)
  }, [])

  // Title line
  function titleLine(g) {
    if (!g) return ""
    const homeAway = (g.home_away || "").toLowerCase() === "home" ? "Home" : "Away"
    return `${g.team_name} vs ${g.opponent_name} · ${homeAway} · ${g.level || ""}`.trim()
  }

  // Aggregated live stats
  const stats = useMemo(() => {
    let assists = 0, rebounds = 0, steals = 0
    let ftMakes = 0, ftAtt = 0
    let fgm = 0, fga = 0, threesMade = 0

    for (const e of events) {
      switch (e.type) {
        case "assist": assists++; break
        case "rebound": rebounds++; break
        case "steal": steals++; break
        case "freethrow": ftAtt++; if (e.made) ftMakes++; break
        case "shot":
          fga++
          if (e.made) {
            fgm++
            if (e.is_three) threesMade++
          }
          break
        default: break
      }
    }
    const fgPct  = fga ? Math.round((fgm / fga) * 100) : 0
    const efgPct = fga ? Math.round(((fgm + 0.5 * threesMade) / fga) * 100) : 0
    return { assists, rebounds, steals, ftMakes, ftAtt, fgm, fga, fgPct, efgPct }
  }, [events])

  // Actions
  async function logQuick(type) {
    await addGameEvent({ game_id: gameId, mode: "game", type, ts: Date.now() })
    await refresh()
  }

  async function logFreeThrow(made) {
    await addGameEvent({ game_id: gameId, mode: "game", type: "freethrow", made, ts: Date.now() })
    setFtModalOpen(false)
    await refresh()
  }

  function openShot(zoneId) {
    const z = zoneMap.get(zoneId)
    setShotModal({
      zoneId,
      isThree: !!z?.isThree,
      shotType: (Array.isArray(SHOT_TYPES) && SHOT_TYPES[0]?.label) || "Jump Shot",
      pressured: false,
    })
  }

  async function commitShot({ zoneId, isThree, shotType, pressured, made }) {
    await addGameEvent({
      game_id: gameId,
      mode: "game",
      type: "shot",
      zone_id: zoneId,
      is_three: !!isThree,
      shot_type: shotType,
      pressured: !!pressured,
      made: !!made,
      ts: Date.now(),
    })
    setShotModal(null)
    await refresh()
  }

  async function onEndGame() {
    if (!game) return
    const ok = window.confirm("End this game?")
    if (!ok) return
    await endGameSession(game.id)
    navigate?.("gate")
  }

  if (loading) {
    return (
      <div className="page">
        <h1 className="screen-title">Game</h1>
        <div className="section">Loading…</div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="text-slate-800 font-medium leading-5 pr-3">
          {titleLine(game)}
        </div>
        <button
          type="button"
          onClick={onEndGame}
          className="btn btn-danger rounded-xl h-10 px-4 text-sm font-semibold"
        >
          End Game
        </button>
      </div>

      {/* Court */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <img
          ref={imgRef}
          src="/images/court-half.svg"  /* <-- adjust if your asset is elsewhere */
          alt="Half court"
          className="w-full block select-none pointer-events-none"
          onLoad={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            setImgSize({ w: r.width, h: r.height })
          }}
        />
        {/* Hotspots */}
        {Object.entries(ZONE_ANCHORS).map(([zoneId, pt]) => {
          const x = pt.x * scale.kx
          const y = pt.y * scale.ky
          return (
            <button
              key={zoneId}
              type="button"
              className="absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-transparent hover:bg-sky-400/20 active:bg-sky-500/25 focus:outline-none"
              style={{ left: x, top: y }}
              aria-label={`Log shot for ${zoneMap.get(zoneId)?.name || zoneId}`}
              onClick={() => openShot(zoneId)}
            />
          )
        })}
      </div>

      {/* Quick stat buttons */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => logQuick("steal")}
          className="h-10 rounded-full border border-sky-300 text-sky-700 bg-sky-50 font-medium flex items-center justify-center gap-2"
        >
          <Hand size={16} /> Steals
        </button>
        <button
          type="button"
          onClick={() => logQuick("rebound")}
          className="h-10 rounded-full border border-sky-300 text-sky-700 bg-sky-50 font-medium flex items-center justify-center gap-2"
        >
          <MdSportsBasketball size={16} /> Rebounds
        </button>
        <button
          type="button"
          onClick={() => logQuick("assist")}
          className="h-10 rounded-full border border-sky-300 text-sky-700 bg-sky-50 font-medium flex items-center justify-center gap-2"
        >
          <Target size={16} /> Assists
        </button>
      </div>

      {/* Free throw */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setFtModalOpen(true)}
          className="h-10 w-full rounded-full border border-slate-300 bg-white font-medium flex items-center justify-center gap-1"
        >
          <Plus size={18} /> Log Free Throw
        </button>
      </div>

      {/* Stats */}
      <section className="section mt-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Assists" value={stats.assists} />
          <StatCard label="Rebounds" value={stats.rebounds} />
          <StatCard label="Steals" value={stats.steals} />
          <StatCard label="FG%" value={`${stats.fgPct}%`} />
          <StatCard label="Makes" value={stats.fgm} />
          <StatCard label="Misses" value={stats.fga - stats.fgm} />
          <StatCard label="Freethrows" value={`${stats.ftMakes}/${stats.ftAtt}`} tint="peach" />
          <StatCard label="eFG%" value={`${stats.efgPct}%`} tint="sky" />
        </div>
      </section>

      {/* Shot Modal */}
      {shotModal && (
        <ShotModal
          data={shotModal}
          onClose={() => setShotModal(null)}
          onMake={(payload) => commitShot({ ...shotModal, ...payload, made: true })}
          onMiss={(payload) => commitShot({ ...shotModal, ...payload, made: false })}
        />
      )}

      {/* Free-throw Modal */}
      {ftModalOpen && (
        <BottomSheet title="Log Free Throw" onClose={() => setFtModalOpen(false)}>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-emerald h-11 rounded-xl" onClick={() => logFreeThrow(true)}>
              Make
            </button>
            <button className="btn btn-danger h-11 rounded-xl" onClick={() => logFreeThrow(false)}>
              Miss
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

/* ---------- small UI parts ---------- */
function StatCard({ label, value, tint }) {
  const tintClass =
    tint === "peach" ? "bg-orange-50"
      : tint === "sky" ? "bg-sky-50"
      : "bg-white"
  return (
    <div className={`rounded-2xl border border-slate-200 ${tintClass} px-4 py-3`}>
      <div className="text-slate-500 text-sm">{label}</div>
      <div className="text-slate-900 font-semibold text-xl">{value}</div>
    </div>
  )
}

function BottomSheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 right-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <div className="text-slate-900 font-semibold">{title}</div>
          <button className="p-1 rounded-lg bg-transparent hover:bg-slate-100" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ShotModal({ data, onClose, onMake, onMiss }) {
  const [shotType, setShotType] = useState(data.shotType || "Jump Shot")
  const [pressured, setPressured] = useState(!!data.pressured)

  const TYPES = Array.isArray(SHOT_TYPES) && SHOT_TYPES.length
    ? SHOT_TYPES
    : [{ id: "jump", label: "Jump Shot" }, { id: "layup", label: "Layup" }]

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 right-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-2xl">
        <div className="text-center text-slate-900 font-semibold mb-2">Select Shot Details</div>
        <div className="text-center text-sm text-slate-600 mb-3">
          {data.zoneId} · {data.isThree ? "3-pointer" : "2-pointer"}
        </div>

        {/* Shot Type */}
        <div className="mb-3">
          <div className="text-sm text-slate-700 mb-1">Shot Type</div>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(st => (
              <button
                key={st.id || st.label}
                onClick={() => setShotType(st.label)}
                className={`h-10 rounded-xl border font-medium ${
                  shotType === st.label
                    ? "border-sky-400 bg-sky-50 text-sky-800"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contested toggle */}
        <div className="mb-4">
          <div className="text-sm text-slate-700 mb-1">Shot Context</div>
          <button
            onClick={() => setPressured(p => !p)}
            className={`h-10 w-full rounded-xl border font-medium ${
              pressured
                ? "border-sky-500 bg-sky-600 text-white"
                : "border-sky-400 text-sky-700 bg-white"
            }`}
          >
            {pressured ? "Contested" : "Uncontested"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn btn-danger h-11 rounded-xl"
            onClick={() => onMiss({ shotType, pressured })}
          >
            Miss
          </button>
          <button
            className="btn btn-emerald h-11 rounded-xl"
            onClick={() => onMake({ shotType, pressured })}
          >
            Make
          </button>
        </div>

        <div className="mt-2 flex justify-center">
          <button className="text-sm text-slate-500 hover:text-slate-700" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
