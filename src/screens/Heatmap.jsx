// src/screens/Heatmap.jsx
import React, { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { supabase, getUser } from "../lib/supabase"
import { TIME_RANGES, getRangeById } from "../constants/timeRange"
import { ZONES } from "../constants/zones"
import { ZONE_ANCHORS } from "../constants/zoneAnchors"

const DEFAULT_RANGE_ID = TIME_RANGES[2]?.id || TIME_RANGES[0]?.id || "30d" // default to 30 days if present

// Visualization modes (no more Free Throws pill here)
const MODE_OPTIONS = [
  { id: "attempts", label: "Attempt Density" },
  { id: "fgpct", label: "FG%" },
]

// Game vs Practice
const SOURCE_OPTIONS = [
  { id: "game", label: "Game" },
  { id: "practice", label: "Practice" },
]

// Shot types – labels must match shot_type values in DB
const SHOT_TYPE_OPTIONS = [
  { id: "Catch & Shoot", label: "Catch & Shoot" },
  { id: "Off-Dribble", label: "Off-Dribble" },
  { id: "Free Throw", label: "Free Throws" },
]

// ---------- anchor helpers (same idea as GameLogger) ----------

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
  let maxX = -Infinity
  let maxY = -Infinity
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

// ---------- pills using shared styles from global.css ----------

function PillGroup({ options, value, onChange }) {
  return (
    <div className="time-pill-group">
      {options.map((opt) => {
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={"time-pill" + (active ? " time-pill--active" : "")}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function TimeRangePills({ value, onChange }) {
  return (
    <div className="time-pill-group">
      {TIME_RANGES.map((r) => {
        const active = r.id === value
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={"time-pill" + (active ? " time-pill--active" : "")}
          >
            {r.label}
          </button>
        )
      })}
    </div>
  )
}

// ---------- data aggregation ----------

function computeZonesFromEvents(events, { mode, shotType, pressuredOnly }) {
  if (!Array.isArray(events) || !events.length) return []

  const filtered = events.filter((e) => {
    const t = e?.type
    const st = e?.shot_type
    const isFtEvent = t === "freethrow" || st === "Free Throw"

    // pressure filter
    if (pressuredOnly && !e?.pressured) return false

    // shot type filter
    if (shotType === "Free Throw") {
      return isFtEvent
    }
    if (shotType === "Catch & Shoot" || shotType === "Off-Dribble") {
      if (isFtEvent) return false
      return st === shotType
    }

    // default: all
    return true
  })

  if (!filtered.length) return []

  const normalShots = filtered.filter((e) => {
    const t = e?.type
    const st = e?.shot_type
    const isFt = t === "freethrow" || st === "Free Throw"
    return !isFt
  })

  const ftShots = filtered.filter((e) => {
    const t = e?.type
    const st = e?.shot_type
    return t === "freethrow" || st === "Free Throw"
  })

  const zoneMap = new Map()

  function ensureZone(id) {
    if (!zoneMap.has(id)) {
      const meta = ZONES.find((z) => z.id === id) || { label: id }
      zoneMap.set(id, {
        id,
        label: meta.label || id,
        attempts: 0,
        makes: 0,
        volumePct: 0,
        fgPct: 0,
        isFreeThrowZone: id === "free_throw",
      })
    }
    return zoneMap.get(id)
  }

  // non-FT field goal shots
  for (const e of normalShots) {
    const zId = e.zone_id || "unknown"
    const row = ensureZone(zId)
    row.attempts += 1
    if (e.made) row.makes += 1
  }

  // free throws aggregated to one zone
  if (ftShots.length) {
    const ftRow = ensureZone("free_throw")
    for (const e of ftShots) {
      ftRow.attempts += 1
      if (e.made) ftRow.makes += 1
    }
  }

  const all = Array.from(zoneMap.values())

  let totalAttempts
  if (shotType === "Free Throw") {
    totalAttempts = all.find((z) => z.id === "free_throw")?.attempts || 0
  } else {
    totalAttempts = all
      .filter((z) => !z.isFreeThrowZone)
      .reduce((sum, z) => sum + z.attempts, 0)
  }

  for (const z of all) {
    if (z.attempts > 0) {
      z.fgPct = Math.round((z.makes / z.attempts) * 100)
      if (totalAttempts > 0) {
        z.volumePct = Math.round((z.attempts / totalAttempts) * 100)
      }
    }
  }

  if (shotType === "Free Throw") {
    const ft = all.find((z) => z.id === "free_throw")
    return ft && ft.attempts ? [ft] : []
  }

  return all
    .filter((z) => !z.isFreeThrowZone && z.attempts > 0)
    .sort((a, b) => a.label.localeCompare(b.label))
}

function zoneDisplayValue(zone, mode) {
  if (!zone) return { label: "0 = 0%", metric: 0 }
  if (mode === "attempts") {
    const vol = zone.volumePct || 0
    return {
      label: `${zone.attempts} = ${vol}%`,
      metric: vol,
    }
  }
  // FG% mode; works for both regular zones and FT zone
  const fg = zone.fgPct || 0
  return {
    label: `${zone.attempts} = ${fg}%`,
    metric: fg,
  }
}

// ---------- zone chip ----------

function ZoneChip({ zone, mode, anchor, onClick }) {
  const { label: valueLabel, metric } = zoneDisplayValue(zone, mode)
  if (!anchor) return null

  let bg = "rgba(15,23,42,0.85)" // default slate dark

  if (mode === "fgpct") {
    // red → green based on accuracy
    const t = Math.min(1, Math.max(0, metric / 100))
    const r = Math.round(220 - 120 * t)
    const g = Math.round(60 + 140 * t)
    const b = 60
    bg = `rgba(${r},${g},${b},0.9)`
  } else if (mode === "attempts") {
    // blue intensity for volume
    const t = Math.min(1, Math.max(0, metric / 100))
    const alpha = 0.4 + 0.4 * t
    bg = `rgba(37,99,235,${alpha})`
  }

  return (
    <button
      type="button"
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 shadow-sm border border-white/30 text-[9px] leading-tight text-slate-50"
      style={{
        left: `${anchor.leftPct}%`,
        top: `${anchor.topPct}%`,
        backgroundColor: bg,
      }}
      onClick={onClick}
    >
      <div className="font-semibold whitespace-nowrap">{zone.label}</div>
      <div className="opacity-90">{valueLabel}</div>
    </button>
  )
}

// ---------- main component ----------

export default function Heatmap({ navigate }) {
  const [mode, setMode] = useState("attempts")
  const [source, setSource] = useState("game")
  const [shotType, setShotType] = useState("Catch & Shoot")
  const [pressuredOnly, setPressuredOnly] = useState(false)
  const [rangeId, setRangeId] = useState(DEFAULT_RANGE_ID)

  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(false)

  // court image + anchors
  const imgRef = useRef(null)
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })

  const ANCHORS_ARR = useMemo(() => anchorsToArray(ZONE_ANCHORS), [])
  const coordMode = useMemo(
    () => detectCoordMode(ANCHORS_ARR),
    [ANCHORS_ARR],
  )
  const pctAnchors = useMemo(() => {
    if (!imgNatural.w || !imgNatural.h) return []
    const base = toPercentAnchors(
      ANCHORS_ARR,
      coordMode,
      imgNatural.w,
      imgNatural.h,
    )
    return base
  }, [ANCHORS_ARR, coordMode, imgNatural])

  const anchorMap = useMemo(() => {
    const m = new Map()
    pctAnchors.forEach((a) => m.set(a.id, a))
    // Free throw fallback position if not in anchors
    if (!m.has("free_throw")) {
      m.set("free_throw", {
        id: "free_throw",
        label: "Free Throw",
        leftPct: 50,
        topPct: 55,
      })
    }
    return m
  }, [pctAnchors])

  const range = useMemo(
    () => getRangeById(rangeId) || { days: 30, label: "30" },
    [rangeId],
  )

  function handleImgLoad(e) {
    const img = e.currentTarget
    const w = img.naturalWidth || 0
    const h = img.naturalHeight || 0
    if (w && h) setImgNatural({ w, h })
  }

  // Load events + compute zones when filters change
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const user = await getUser()
        if (!user) {
          if (!cancelled) setZones([])
          return
        }

        const table = source === "game" ? "game_events" : "practice_entries"
        let query = supabase.from(table).select("*").eq("user_id", user.id)

        if (range.days && Number.isFinite(range.days)) {
          const since = new Date(
            Date.now() - range.days * 24 * 60 * 60 * 1000,
          ).toISOString()
          query = query.gte("ts", since)
        }

        const { data, error } = await query
        if (error) throw error

        const z = computeZonesFromEvents(data || [], {
          mode,
          shotType,
          pressuredOnly,
        })

        if (!cancelled) setZones(z)
      } catch (err) {
        console.warn("[Heatmap] load error", err)
        if (!cancelled) setZones([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [source, range.days, mode, shotType, pressuredOnly])

  const totalAttempts = useMemo(
    () => zones.reduce((sum, z) => sum + z.attempts, 0),
    [zones],
  )

  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-screen-sm mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate?.("home")}
            className="btn-back flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex flex-col items-center">
            <h2 className="text-sm font-semibold text-slate-900">Heatmap</h2>
            <span className="text-[11px] text-slate-500">
              Tap a zone to see details.
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-200" />
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto p-4 pb-24 space-y-4">
        {/* TOP: Source pills (Game / Practice) */}
        <section className="space-y-1">
          <span className="block text-xs font-semibold text-slate-700">
            Source
          </span>
          <PillGroup
            options={SOURCE_OPTIONS}
            value={source}
            onChange={setSource}
          />
        </section>

        {/* Filters (Days, Mode, Shot Type, Pressure) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
          {/* Days */}
          <div className="space-y-1">
            <span className="block text-xs font-semibold text-slate-700">
              Days
            </span>
            <TimeRangePills value={rangeId} onChange={setRangeId} />
          </div>

          {/* Mode (Attempt Density / FG%) */}
          <div className="space-y-1">
            <span className="block text-xs font-semibold text-slate-700">
              Mode
            </span>
            <PillGroup options={MODE_OPTIONS} value={mode} onChange={setMode} />
          </div>

          {/* Shot type */}
          <div className="space-y-1">
            <span className="block text-xs font-semibold text-slate-700">
              Shot Type
            </span>
            <div className="time-pill-group flex-wrap">
              {SHOT_TYPE_OPTIONS.map((opt) => {
                const active = opt.id === shotType
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setShotType(opt.id)}
                    className={
                      "time-pill" + (active ? " time-pill--active" : "")
                    }
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Pressured */}
          <div className="space-y-1">
            <span className="block text-xs font-semibold text-slate-700">
              Pressure
            </span>
            <button
              type="button"
              onClick={() => setPressuredOnly((v) => !v)}
              className={
                "time-pill" + (pressuredOnly ? " time-pill--active" : "")
              }
            >
              Pressured
            </button>
          </div>
        </section>

        {/* Court + zone overlays */}
        <section className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-800">
              Court View
            </div>
            <div className="text-[11px] text-slate-500">
              {loading
                ? "Loading…"
                : totalAttempts
                ? `${totalAttempts} attempts`
                : "No attempts in this range"}
            </div>
          </div>

          <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-white">
            <img
              ref={imgRef}
              src="/court-half.svg"
              alt="Half court"
              className="w-full h-auto block select-none pointer-events-none"
              onLoad={handleImgLoad}
            />

            {zones.map((z) => {
              const anchor = anchorMap.get(z.id)
              return (
                <ZoneChip
                  key={z.id}
                  zone={z}
                  mode={mode}
                  anchor={anchor}
                  onClick={() => {
                    // hook up modal later if desired
                  }}
                />
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
