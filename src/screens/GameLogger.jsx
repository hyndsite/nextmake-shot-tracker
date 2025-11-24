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
import { ArrowLeft } from "lucide-react"

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
  let maxX = -Infinity,
    maxY = -Infinity
  for (const a of arr) {
    maxX = Math.max(maxX, a.x || 0)
    maxY = Math.max(maxY, a.y || 0)
  }
  if (maxX <= 1 && maxY <= 1) return "fraction"
  if (maxX > 100 || maxY > 100) return "pixel"
  return "percent"
}
function toPercentAnchors(arr, mode, imgW, imgH) {
  return arr.map((a) => {
    let leftPct, topPct
    if (mode === "fraction") {
      leftPct = a.x * 100
      topPct = a.y * 100
    } else if (mode === "pixel") {
      leftPct = (a.x / imgW) * 100
      topPct = (a.y / imgH) * 100
    } else {
      leftPct = a.x
      topPct = a.y
    }
    return { id: a.id, label: a.label, leftPct, topPct }
  })
}

function describeShot(e, zoneMap) {
  const zone = zoneMap.get(e.zone_id)
  const zoneLabel = zone?.label || e.zone_id || "Unknown Zone"
  const shotType = e.shot_type || ""
  const shotValue = e.is_three ? "3 pointer" : "2 pointer"
  const result = e.made ? "Make" : "Miss"
  return { shotValue, zoneLabel, shotType, result }
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
  const imgRef = useRef(null)
  const [teamScore, setTeamScore] = useState("")
  const [oppScore, setOppScore] = useState("")
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

  const pct = (m, a) => {
    return a ? ((m / a) * 100).toFixed(1) : 0
  }

  // Load game + events
  async function refresh() {
    setLoading(true)
    const [g, ev] = await Promise.all([
      getGameSession(gameId),
      listGameEventsBySession(gameId),
    ])
    setGame(g || null)
    setEvents(ev || [])

    if (g) {
      setTeamScore(g.team_score ?? "")
      setOppScore(g.opponent_score ?? "")
    } else {
      setTeamScore("")
      setOppScore("")
    }

    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [gameId])

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
    let assists = 0,
      rebounds = 0,
      steals = 0
    let ftMakes = 0,
      ftAtt = 0
    let fgm = 0,
      fga = 0,
      threesMade = 0

    for (const e of events) {
      switch (e.type) {
        case "assist":
          assists++
          break
        case "rebound":
          rebounds++
          break
        case "steal":
          steals++
          break
        case "freethrow":
          ftAtt++
          if (e.made) ftMakes++
          break
        case "shot":
          fga++
          if (e.made) {
            fgm++
            if (e.is_three) threesMade++
          }
          break
        default:
          break
      }
    }

    const fgPct = fga ? Math.round((fgm / fga) * 100) : 0
    const efgPct = fga
      ? Math.round(((fgm + 0.5 * threesMade) / fga) * 100)
      : 0

    const twoPtMakes = fgm - threesMade
    const threePtMakes = threesMade
    const totalPoints = twoPtMakes * 2 + threePtMakes * 3 + ftMakes

    return {
      assists,
      rebounds,
      steals,
      ftMakes,
      ftAtt,
      fgm,
      fga,
      fgPct,
      efgPct,
      twoPtMakes,
      threePtMakes,
      totalPoints,
    }
  }, [events])

  // Actions
  async function logQuick(type) {
    await addGameEvent({ game_id: gameId, mode: "game", type, ts: Date.now() })
    await refresh()
  }
  async function logFreeThrow(made) {
    await addGameEvent({
      game_id: gameId,
      mode: "game",
      type: "freethrow",
      made,
      ts: Date.now(),
    })
    setFtModalOpen(false)
    await refresh()
  }
  function openShot(zoneId) {
    const z = zoneMap.get(zoneId)
    const defaultType = null // force user to choose shot type first
    setShotModal({
      zoneId,
      zoneLabel: z?.label || zoneId,
      isThree: !!z?.isThree,
      shotType: defaultType, // null initially → must select
      pressured: null, // null initially → must select after shot type
    })
  }

  // 🔁 now also accepts pickupType / finishType and passes them through
  async function commitShot({
    zoneId,
    isThree,
    shotType,
    pressured,
    made,
    pickupType,
    finishType,
  }) {
    await addGameEvent({
      game_id: gameId,
      mode: "game",
      type: "shot",
      zone_id: zoneId,
      is_three: !!isThree,
      shot_type: shotType,
      pressured: !!pressured,
      made: !!made,
      // layup metadata (optional, only set when provided)
      pickupType,
      finishType,
      ts: Date.now(),
    })
    setShotModal(null)
    await refresh()
  }

  async function onEndGame() {
    if (!game) return
    const ok = window.confirm("End this game?")
    if (!ok) return

    const teamScoreInt =
      teamScore === "" ? null : Number.parseInt(teamScore, 10)
    const oppScoreInt =
      oppScore === "" ? null : Number.parseInt(oppScore, 10)

    await endGameSession(game.id, {
      team_score:
        Number.isFinite(teamScoreInt) && teamScoreInt >= 0
          ? teamScoreInt
          : null,
      opponent_score:
        Number.isFinite(oppScoreInt) && oppScoreInt >= 0
          ? oppScoreInt
          : null,
    })

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

  function MiniStat({ label, value }) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-center">
        <div className="text-[10px] uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="text-sm font-semibold text-slate-900">{value}</div>
      </div>
    )
  }

  function getShotColor(event) {
    const type = (event.shot_type || event.shotType || "").toLowerCase()
    const isLayup = type === "layup"

    // Layups override normal make/miss colors
    if (isLayup && event.made) return "#2563eb" // blue: made layup
    if (isLayup && !event.made) return "#eab308" // yellow: missed layup

    if (event.made) return "#059669" // green: made shot
    return "#dc2626" // red: missed shot
  }

  function LegendRow({ color, label }) {
    return (
      <div className="flex items-center gap-1 text-[11px] leading-tight">
        <MdSportsBasketball color={color} style={{ width: 12, height: 12 }} />
        <span className="text-slate-700">{label}</span>
      </div>
    )
  }

  return (
    <div className="page gamelogger">
      <div className="relative mb-3 h-10 flex items-center justify-center">
        <button
          type="button"
          onClick={() => navigate?.("gate")}
          className="btn-back absolute left-0"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="text-center text-slate-800 font-medium leading-5 px-20">
          {titleLine(game)}
        </div>
      </div>

      {/* Final score inputs */}
      <div className="mb-3 flex items-center justify-center gap-2">
        <span className="text-xs font-medium text-slate-600">Final Score</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          className="w-14 h-8 rounded-lg border border-slate-300 text-center text-sm bg-white text-slate-900 placeholder-slate-400"
          value={teamScore}
          onChange={(e) => setTeamScore(e.target.value)}
          placeholder="Us"
        />
        <span className="text-xs text-slate-500">-</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          className="w-14 h-8 rounded-lg border border-slate-300 text-center text-sm bg-white text-slate-900 placeholder-slate-400"
          value={oppScore}
          onChange={(e) => setOppScore(e.target.value)}
          placeholder="Them"
        />
      </div>

      {/* Court and overlay */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-white">
        <img
          ref={imgRef}
          src="/court-half.svg" /* must exist in /public/court-half.svg */
          alt="Half court"
          className="w-full h-auto block select-none pointer-events-none"
          onLoad={onImgLoad}
        />

        {/* Plotted makes/misses */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.isArray(events) &&
            events
              .filter((e) => e.type === "shot")
              .map((e, idx) => {
                const anchor = pctAnchors.find((a) => a.id === e.zone_id)
                if (!anchor) return null
                return (
                  <div
                    key={`mk-${idx}`}
                    className="zone-marker"
                    style={{
                      left: `${anchor.leftPct}%`,
                      top: `${anchor.topPct}%`,
                    }}
                  >
                    <MdSportsBasketball
                      color={getShotColor(e)}
                      style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.25))" }}
                    />
                  </div>
                )
              })}
        </div>

        {/* Invisible / subtle click targets aligned to those anchors */}
        <div className="absolute inset-0">
          {pctAnchors.map((a) => (
            <button
              key={a.id}
              type="button"
              className="zone-hit"
              style={{ left: `${a.leftPct}%`, top: `${a.topPct}%` }}
              aria-label={`Log shot for ${a.label || a.id}`}
              onClick={() => openShot(a.id)}
            >
              <span className="zone-hit-inner" />
            </button>
          ))}
        </div>
        <div className="absolute bottom-2 right-2 bg-white/90 rounded-lg shadow px-2 py-1 space-y-1">
          <LegendRow color="#059669" label="made shot" />
          <LegendRow color="#dc2626" label="missed shot" />
          <LegendRow color="#2563eb" label="made layup" />
          <LegendRow color="#eab308" label="missed layup" />
        </div>
      </div>

      {/* Quick stat buttons — white bg + blue border */}
      <div className="gamelogger mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => logQuick("steal")}
          className="quick-btn"
        >
          <Hand size={16} /> Steals
        </button>
        <button
          type="button"
          onClick={() => logQuick("rebound")}
          className="quick-btn"
        >
          <MdSportsBasketball size={16} /> Rebounds
        </button>
        <button
          type="button"
          onClick={() => logQuick("assist")}
          className="quick-btn"
        >
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
        {/* Scoring summary row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <MiniStat label="2PT" value={stats.twoPtMakes} />
          <MiniStat label="3PT" value={stats.threePtMakes} />
          <MiniStat label="FT" value={stats.ftMakes} />
          <MiniStat label="TP" value={stats.totalPoints} />
        </div>

        {/* Existing 2-column stat grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Assists" value={stats.assists} />
          <StatCard label="Rebounds" value={stats.rebounds} />
          <StatCard label="Steals" value={stats.steals} />
          <StatCard label="FG%" value={`${stats.fgPct}%`} />
          <StatCard label="Makes" value={stats.fgm} />
          <StatCard label="Misses" value={stats.fga - stats.fgm} />
          <StatCard
            label="Freethrows"
            value={`${stats.ftMakes}/${stats.ftAtt}`}
            tint="peach"
          />
          <StatCard label="eFG%" value={`${stats.efgPct}%`} tint="sky" />
        </div>
      </section>

      {/* Shot Attempts Log */}
      <section className="section mt-3">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          Shot Attempts
        </h3>

        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {events.filter((e) => e.type === "shot").length === 0 && (
            <div className="p-2 text-sm text-slate-500 text-center">
              No shots logged yet.
            </div>
          )}

          {events
            .filter((e) => e.type === "shot")
            .slice() // create a shallow copy before reverse
            .reverse() // newest at top
            .map((e) => {
              const { shotValue, zoneLabel, shotType, result } = describeShot(
                e,
                zoneMap,
              )
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between px-3 py-1.5 text-sm"
                >
                  <div className="text-slate-800 font-medium w-[90px]">
                    {shotValue}
                  </div>
                  <div className="flex-1 text-slate-600 truncate text-center">
                    {zoneLabel}
                  </div>
                  <div className="flex-1 text-slate-600 truncate text-center">
                    {shotType}
                  </div>
                  <div
                    className={`w-[60px] text-right font-semibold ${
                      e.made ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {result}
                  </div>
                </div>
              )
            })}
        </div>
      </section>

      {/* Full-width bottom End Game button */}
      <div className="rounded-xl bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={onEndGame}
          className="btn btn-danger w-full h-12 rounded-xl bg-red-600 text-white font-semibold text-base shadow hover:bg-red-700 active:scale-[0.98] transition-all"
        >
          End Game
        </button>
      </div>

      {/* Shot modal */}
      {shotModal && (
        <ShotModal
          data={shotModal}
          onClose={() => setShotModal(null)}
          onMake={(payload) =>
            commitShot({ ...shotModal, ...payload, made: true })
          }
          onMiss={(payload) =>
            commitShot({ ...shotModal, ...payload, made: false })
          }
        />
      )}

      {/* FT sheet */}
      {ftModalOpen && (
        <BottomSheet
          title="Log Free Throw"
          onClose={() => setFtModalOpen(false)}
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn btn-emerald h-11 rounded-xl"
              onClick={() => logFreeThrow(true)}
            >
              Make
            </button>
            <button
              className="btn btn-danger h-11 rounded-xl"
              onClick={() => logFreeThrow(false)}
            >
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
    tint === "peach"
      ? "bg-orange-50"
      : tint === "sky"
      ? "bg-sky-50"
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
          <button
            className="p-1 rounded-lg bg-transparent hover:bg-slate-100"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------
   Shot details modal (updated behavior)
   - Must select Shot Type first.
   - After Shot Type is selected:
       * Contested toggle is enabled (optional).
       * Make and Miss are enabled regardless of Contested.
   - If Shot Type is Layup, optional pickup/finish metadata can be set.
--------------------------------------------------------- */
function ShotModal({ data, onClose, onMake, onMiss }) {
  // Start from data, but allow null → user must pick shot type
  const [shotType, setShotType] = useState(data.shotType || null)
  const [pressured, setPressured] = useState(
    typeof data.pressured === "boolean" ? data.pressured : false,
  )

  // NEW: layup metadata for game events
  const [pickupType, setPickupType] = useState(null)
  const [finishType, setFinishType] = useState(null)

  const TYPES =
    Array.isArray(SHOT_TYPES) && SHOT_TYPES.length
      ? SHOT_TYPES
      : [
          { id: "jump", label: "Jump Shot" },
          { id: "layup", label: "Layup" },
        ]

  const hasShotType = !!shotType
  const canToggleContested = hasShotType
  const isContested = !!pressured
  const canSubmit = hasShotType // Make/Miss require Shot Type ONLY

  const isLayup =
    (shotType || "").toLowerCase().includes("layup")

  const LAYUP_PICKUP_TYPES = [
    "Low Pickup",
    "Football",
    "Overhead",
  ]
  const LAYUP_FINISH_TYPES = [
    "Underhand",
    "Overhand",
  ]

  return (
    <div className="fixed inset-0 z-50 shotmodal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 right-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-2xl">
        <div className="text-center text-slate-900 font-semibold mb-2">
          {data.zoneLabel}
        </div>
        <div className="text-center text-sm text-slate-600 mb-3">
          {data.isThree ? "3-pointer" : "2-pointer"}
        </div>

        {/* Shot Type (must be selected before anything else is enabled) */}
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

        {/* If layup: pickup & finish metadata */}
        {isLayup && (
          <div className="mb-3 space-y-3">
            <div>
              <div className="text-sm text-slate-700 mb-1">
                Pickup Type (Layup)
              </div>
              <div className="grid grid-cols-3 gap-2">
                {LAYUP_PICKUP_TYPES.map((pt) => {
                  const selected = pickupType === pt
                  return (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setPickupType(pt)}
                      className={`shot-type-btn ${selected ? "selected" : ""}`}
                    >
                      {pt}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-700 mb-1">
                Finish Type (Layup)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LAYUP_FINISH_TYPES.map((ft) => {
                  const selected = finishType === ft
                  return (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => setFinishType(ft)}
                      className={`shot-type-btn ${selected ? "selected" : ""}`}
                    >
                      {ft}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Contested toggle (optional, but only after shot type chosen) */}
        <div className="mb-4">
          <div className="text-sm text-slate-700 mb-1">Shot Context</div>

          <button
            disabled={!canToggleContested}
            onClick={() =>
              canToggleContested && setPressured((prev) => !prev)
            }
            className={`w-full contested-btn ${
              isContested ? "selected" : ""
            } ${!canToggleContested ? "disabled" : ""}`}
          >
            {isContested ? "Contested" : "Uncontested"}
          </button>
        </div>

        {/* Make / Miss buttons (enabled as soon as shot type is selected) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={!canSubmit}
            className={
              canSubmit
                ? "btn btn-danger h-11 rounded-xl"
                : "h-11 rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed"
            }
            onClick={() =>
              onMiss({
                shotType,
                pressured: isContested,
                pickupType,
                finishType,
              })
            }
          >
            Miss
          </button>
          <button
            disabled={!canSubmit}
            className={
              canSubmit
                ? "btn btn-emerald h-11 rounded-xl"
                : "h-11 rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed"
            }
            onClick={() =>
              onMake({
                shotType,
                pressured: isContested,
                pickupType,
                finishType,
              })
            }
          >
            Make
          </button>
        </div>

        <div className="mt-2 flex justify-center">
          <button
            className="w-full text-sm text-slate-500 hover:text-slate-700"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
