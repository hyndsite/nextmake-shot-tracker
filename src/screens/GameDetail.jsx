// src/screens/GameDetail.jsx
import React, { useEffect, useMemo, useState } from "react"
import { MdSportsBasketball } from "react-icons/md"
import { ZONES } from "../constants/zones"
import { ZONE_ANCHORS } from "../constants/zoneAnchors"
import { getGameSession, listGameEventsBySession } from "../lib/game-db"
import "../styles/GameLogger.css" 
import { ArrowLeft } from "lucide-react"

/* ----------------------- anchor helpers (same as GameLogger) ----------------------- */
function anchorsToArray(anchors) {
  if (Array.isArray(anchors)) {
    return anchors.map((a, i) => ({
      id: a.id ?? a.key ?? a.zoneId ?? String(i),
      x: a.x, y: a.y, label: a.label ?? (a.id ?? a.zoneId ?? String(i)),
    }))
  }
  return Object.entries(anchors || {}).map(([id, pt]) => ({
    id, x: pt.x, y: pt.y, label: pt.label ?? id,
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

/* ----------------------------------- component ----------------------------------- */
export default function GameDetail({ id: gameId, navigate }) {
  const [game, setGame] = useState(null)
  const [events, setEvents] = useState([])
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })

  // precompute anchors in % just like GameLogger
  const ANCHORS_ARR = useMemo(() => anchorsToArray(ZONE_ANCHORS), [])
  const coordMode   = useMemo(() => detectCoordMode(ANCHORS_ARR), [ANCHORS_ARR])
  const pctAnchors  = useMemo(() => {
    if (!imgNatural.w || !imgNatural.h) return []
    return toPercentAnchors(ANCHORS_ARR, coordMode, imgNatural.w, imgNatural.h)
  }, [ANCHORS_ARR, coordMode, imgNatural])

  // zones map (for label lookups if needed later)
  const zoneMap = useMemo(() => {
    const m = new Map(); (ZONES || []).forEach((z) => m.set(z.id, z)); return m
  }, [])

  useEffect(() => {
    (async () => {
      const [g, ev] = await Promise.all([
        getGameSession(gameId),
        listGameEventsBySession(gameId),
      ])
      setGame(g || null)
      setEvents(ev || [])
    })()
  }, [gameId])

  function onImgLoad(e) {
    const img = e.currentTarget
    const w = img.naturalWidth || 0
    const h = img.naturalHeight || 0
    if (w && h) setImgNatural({ w, h })
  }

  function titleLine(g) {
    if (!g) return ""
    const ha = (g.home_away || "").toLowerCase() === "home" ? "Home" : "Away"
    return `${g.team_name} · ${ha} · ${g.level || ""}`.replace(/\s·\s$/, "")
  }

  // basic stats (match GameLogger)
  const stats = useMemo(() => {
    let assists = 0, rebounds = 0, steals = 0
    let ftMakes = 0, ftAtt = 0
    let fgm = 0, fga = 0, threesMade = 0
    for (const e of events) {
      switch (e.type) {
        case "assist":    assists++; break
        case "rebound":   rebounds++; break
        case "steal":     steals++; break
        case "freethrow": ftAtt++; if (e.made) ftMakes++; break
        case "shot":
          fga++; if (e.made) { fgm++; if (e.is_three) threesMade++ }
          break
        default: break
      }
    }
    const fgPct  = fga ? Math.round((fgm / fga) * 100) : 0
    const efgPct = fga ? Math.round(((fgm + 0.5 * threesMade) / fga) * 100) : 0
    return { assists, rebounds, steals, ftMakes, ftAtt, fgm, fga, fgPct, efgPct }
  }, [events])

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center mb-3">
        <button
            type="button"
            onClick={() => navigate?.("gate")}
            className="btn-back"
        >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
        </button>
        </div>
      <div className="mb-2 text-center">
        <div className="text-slate-900 font-semibold">
          {game ? `${game.opponent_name ? `${game.team_name} vs ${game.opponent_name}` : game.team_name}` : "Game"}
        </div>
        <div className="text-slate-600 text-sm">{titleLine(game)}</div>
        {game?.date_iso && (
          <div className="text-slate-500 text-xs mt-0.5">
            {new Date(game.date_iso).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Court with markers (no tap zones) */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-white">
        <img
          src="/court-half.svg"
          alt="Half court"
          className="block w-full h-auto select-none pointer-events-none"
          onLoad={onImgLoad}
        />
        <div className="absolute inset-0">
          {Array.isArray(events) && events
            .filter((e) => e.type === "shot")
            .map((e, idx) => {
              const anchor = pctAnchors.find((a) => a.id === e.zone_id)
              if (!anchor) return null
              return (
                <div
                  key={`mk-${idx}`}
                  className="zone-marker"
                  style={{ left: `${anchor.leftPct}%`, top: `${anchor.topPct}%` }}
                  aria-label={`${zoneMap.get(e.zone_id)?.label || e.zone_id} ${e.made ? "make" : "miss"}`}
                >
                  <MdSportsBasketball
                    color={e.made ? "#059669" /* emerald-600 */ : "#9ca3af" /* gray-400 */}
                    style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.25))" }}
                  />
                </div>
              )
            })}
        </div>
      </div>

      {/* Stats grid (read-only) */}
      <section className="section mt-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Assists" value={stats.assists} />
          <StatCard label="Rebounds" value={stats.rebounds} />
          <StatCard label="Steals" value={stats.steals} />
          <StatCard label="Freethrows" value={`${stats.ftMakes} / ${stats.ftAtt}`} tint="peach" />
          <StatCard label="Makes" value={stats.fgm} />
          <StatCard label="Misses" value={stats.fga - stats.fgm} />
          <StatCard label="FG%" value={`${stats.fgPct}%`} />
          <StatCard label="eFG%" value={`${stats.efgPct}%`} tint="sky" />
        </div>
      </section>
    </div>
  )
}

/* same simple card used in GameLogger */
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
