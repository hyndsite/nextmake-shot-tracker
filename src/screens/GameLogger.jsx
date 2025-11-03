import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { SHOT_TYPES } from "../constants/shotTypes"
import { ZONES } from "../constants/zones"
import { ZONE_ANCHORS } from "../constants/zoneAnchors"
import {
  endGameSession,
  getGameSession,
  listGameEventsBySession,
  addGameEvent,
} from "../lib/game-db"
import { X, Target, Hand, Plus } from "lucide-react"
import { MdSportsBasketball } from "react-icons/md"
import "../styles/GameLogger.css"
import { ArrowLeft } from "lucide-react" // at the top if you aren’t already
/* ---------------------------------------------------------
   Anchor helpers (handles object map or array inputs)
--------------------------------------------------------- */
function anchorsToArray(anchors) {
  if (Array.isArray(anchors)) {
    return anchors.map((a, i) => ({
      id: a.id ?? a.key ?? a.zoneId ?? String(i),
      x: a.x,
      y: a.y,
      label: a.label ?? (a.id ?? a.zoneId ?? String(i)),
    }))
  }
  return Object.entries(anchors || {}).map(([id, pt]) => ({
    id,
    x: pt.x,
    y: pt.y,
    label: pt.label ?? id,
  }))
}
function detectCoordMode(arr) {
  let maxX = -Infinity, maxY = -Infinity
  for (const a of arr) { maxX = Math.max(maxX, a.x || 0); maxY = Math.max(maxY, a.y || 0) }
  if (maxX <= 1 && maxY <= 1) return "fraction"
  if (maxX > 100 || maxY > 100) return "pixel"
  return "percent"
}
function toPercentAnchors(arr, mode, imgW, imgH) {
  return arr.map((a) => {
    let leftPct, topPct
    if (mode === "fraction") { leftPct = a.x * 100; topPct = a.y * 100 }
    else if (mode === "pixel") { leftPct = (a.x / imgW) * 100; topPct = (a.y / imgH) * 100 }
    else { leftPct = a.x; topPct = a.y }
    return { id: a.id, label: a.label, leftPct, topPct }
  })
}

/* ---------------------------------------------------------
   Main component
--------------------------------------------------------- */
export default function GameLogger({ id: gameId, navigate }) {
  const [game, setGame] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [shotModal, setShotModal] = useState(null) // { zoneId, zoneLabel, isThree, shotType, pressured }
  const [ftModalOpen, setFtModalOpen] = useState(false)

  // Court sizing / anchors
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })
  const ANCHORS_ARR = useMemo(() => anchorsToArray(ZONE_ANCHORS), [])
  const coordMode = useMemo(() => detectCoordMode(ANCHORS_ARR), [ANCHORS_ARR])
  const pctAnchors = useMemo(() => {
    if (!imgNatural.w || !imgNatural.h) return []
    return toPercentAnchors(ANCHORS_ARR, coordMode, imgNatural.w, imgNatural.h)
  }, [ANCHORS_ARR, coordMode, imgNatural])

  // Zones map
  const zoneMap = useMemo(() => {
    const m = new Map()
    ZONES.forEach((z) => m.set(z.id, z))
    return m
  }, [])

  const pct = (m, a) => { return a ? ((m / a) * 100).toFixed(1) : 0}

  // Load game + events
  async function refresh() {
    setLoading(true)
    const [g, ev] = await Promise.all([
      getGameSession(gameId),
      listGameEventsBySession(gameId),
    ])
    setGame(g || null)
    setEvents(ev || [])
    setLoading(false)
  }
  useEffect(() => { void refresh() }, [gameId])

  // read image intrinsic size (once on load)
  function onImgLoad(e) {
    const img = e.currentTarget
    const w = img.naturalWidth || 0
    const h = img.naturalHeight || 0
    if (w && h) setImgNatural({ w, h })
  }

  function titleLine(g) {
    if (!g) return ""
    const ha = (g.home_away || "").toLowerCase() === "home" ? "Home" : "Away"
    return `${g.team_name} vs ${g.opponent_name} · ${ha} · ${g.level || ""}`.trim()
  }

  // Live stats
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
          if (e.made) { fgm++; if (e.is_three) threesMade++ }
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
    setFtModalOpen(false); await refresh()
  }
  function openShot(zoneId) {
    const z = zoneMap.get(zoneId)
    const defaultType = null // force user to choose shot type first
    setShotModal({
      zoneId,
      zoneLabel: z?.label || zoneId,
      isThree: !!z?.isThree,
      shotType: defaultType,      // null initially → must select
      pressured: null,            // null initially → must select after shot type
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
    setShotModal(null); await refresh()
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
      <div className="flex items-center mb-3">
        <button
          type="button"
          onClick={() => navigate?.("gate")} // or setActiveTab('game') if using your App tab state
          className="flex items-center gap-1 border border-sky-600 text-sky-700 px-3 py-1.5 rounded-lg bg-white hover:bg-sky-50 active:scale-[0.98] shadow-sm"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>
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

      {/* Court and overlay */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-white">
        <img
          src="/court-half.svg" /* must exist in /public/court-half.svg */
          alt="Half court"
          className="w-full h-auto block select-none pointer-events-none"
          onLoad={onImgLoad}
        />
        <div className="absolute inset-0">
          {pctAnchors.map((a) => (
            <button
              key={a.id}
              type="button"
              className="zone-btn absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-lg bg-white/90 hover:bg-white active:scale-[0.98] shadow"
              style={{ left: `${a.leftPct}%`, top: `${a.topPct}%` }}
              aria-label={`Log shot for ${a.label || a.id}`}
              onClick={() => openShot(a.id)}
            />
          ))}

          {/* Shot markers (basketballs) */}
          {Array.isArray(events) && events
            .filter((e) => e.type === "shot")
            .map((e, idx) => {
              const anchor = pctAnchors.find((a) => a.id === e.zone_id)
              if (!anchor) return null
              return (
                <div
                  key={`m-${idx}`}
                  className="zone-marker"
                  style={{
                    left: `${anchor.leftPct}%`,
                    top: `${anchor.topPct}%`,
                  }}
                >
                  <MdSportsBasketball
                    color={e.made ? "#12e346" : "#9ca3af"} // emerald-600 or gray-400
                    style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.2))" }}
                  />
                </div>
              )
            })}
        </div>
      </div>

      {/* Quick stat buttons — white bg + blue border */}
      <div className="gamelogger mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => logQuick("steal")} className="quick-btn">
          <Hand size={16} /> Steals
        </button>
        <button type="button" onClick={() => logQuick("rebound")} className="quick-btn">
          <MdSportsBasketball size={16} /> Rebounds
        </button>
        <button type="button" onClick={() => logQuick("assist")} className="quick-btn">
          <Target size={16} /> Assists
        </button>
      </div>

      {/* Free throws — solid emerald */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setFtModalOpen(true)}
          className="btn btn-emerald h-10 w-full rounded-full font-medium flex items-center justify-center gap-1"
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
          <StatCard label="Freethrows" value={`${stats.ftMakes} / ${stats.ftAtt} / ${pct(stats.ftMakes, stats.ftAtt)}%`} tint="peach" />
          <StatCard label="Makes" value={stats.fgm} />
          <StatCard label="Misses" value={stats.fga - stats.fgm} />
          <StatCard label="FG%" value={`${stats.fgPct}%`} />
          <StatCard label="eFG%" value={`${stats.efgPct}%`} tint="sky" />
        </div>
      </section>

      {/* Shot modal */}
      {shotModal && (
        <ShotModal
          data={shotModal}
          onClose={() => setShotModal(null)}
          onMake={(payload) => commitShot({ ...shotModal, ...payload, made: true })}
          onMiss={(payload) => commitShot({ ...shotModal, ...payload, made: false })}
        />
      )}

      {/* FT sheet */}
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

/* ---------------------------------------------------------
   Small UI pieces
--------------------------------------------------------- */
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

/* ---------------------------------------------------------
   Shot details modal (new gating rules)
--------------------------------------------------------- */
function ShotModal({ data, onClose, onMake, onMiss }) {
  const [shotType, setShotType] = useState(data.shotType)   // starts as null
  const [pressured, setPressured] = useState(data.pressured) // starts as null

  const TYPES = (Array.isArray(SHOT_TYPES) && SHOT_TYPES.length)
    ? SHOT_TYPES
    : [{ id: "jump", label: "Jump Shot" }, { id: "layup", label: "Layup" }]

  const hasShotType = !!shotType
  const canToggleContested = hasShotType
  const isContested = pressured === true
  const canSubmit = isContested // per requirement: must select Contested to enable Make/Miss

  return (
    <div className="fixed inset-0 z-50 shotmodal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 right-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-2xl">
        <div className="text-center text-slate-900 font-semibold mb-2">
          {/* Use label from ZONES (passed as zoneLabel) */}
          {data.zoneLabel}
        </div>
        <div className="text-center text-sm text-slate-600 mb-3">
          {data.isThree ? "3-pointer" : "2-pointer"}
        </div>

        {/* Shot Type (blue outline → solid when selected) */}
        <div className="mb-3">
          <div className="text-sm text-slate-700 mb-1">Shot Type</div>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((st) => {
              const selected = shotType === st.label
              return (
                <button
                  key={st.id || st.label}
                  onClick={() => setShotType(st.label)}
                  className={`shot-type-btn ${selected ? "selected" : ""}`}
                >
                  {st.label}
                </button>
              )
            })}
          </div>
        </div>

       {/* Contested toggle (disabled until shot type chosen) */}
        <div className="mb-4">
          <div className="text-sm text-slate-700 mb-1">Shot Context</div>

          <button
            disabled={!canToggleContested}
            onClick={() => canToggleContested && setPressured(p => p === true ? null : true)}
            className={`w-full contested-btn ${isContested ? "selected" : ""} ${!canToggleContested ? "disabled" : ""}`}
          >
            Contested
          </button>

          {/* Note: per requirement, Make/Miss are only enabled if Contested is selected */}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={!canSubmit}
            className={`w-full h-11 rounded-xl btn ${canSubmit ? "btn-danger" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
            onClick={() => onMiss({ shotType, pressured: true })}
          >
            Miss
          </button>
          <button
            disabled={!canSubmit}
            className={`w-full h-11 rounded-xl btn ${canSubmit ? "btn-emerald" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
            onClick={() => onMake({ shotType, pressured: true })}
          >
            Make
          </button>
        </div>

        <div className="mt-2 flex justify-center">
          <button className="w-full text-sm text-slate-500 hover:text-slate-700" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
