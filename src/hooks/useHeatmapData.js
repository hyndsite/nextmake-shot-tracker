import { useEffect, useMemo, useState } from "react"

import { supabase, getUser } from "../lib/supabase"
import { TIME_RANGES, getRangeById } from "../constants/timeRange"
import { ZONES } from "../constants/zones"
import { ZONE_ANCHORS } from "../constants/zoneAnchors"
import {
  listAthletes,
  getActiveAthleteId,
  setActiveAthlete,
} from "../lib/athlete-db"

const DEFAULT_RANGE_ID = TIME_RANGES[2]?.id || TIME_RANGES[0]?.id || "30d"

function anchorsToArray(anchors) {
  if (Array.isArray(anchors)) {
    return anchors.map((anchor, index) => ({
      id: anchor.id ?? anchor.key ?? anchor.zoneId ?? String(index),
      x: anchor.x,
      y: anchor.y,
      label: anchor.label ?? (anchor.id ?? anchor.zoneId ?? String(index)),
    }))
  }

  return Object.entries(anchors || {}).map(([id, point]) => ({
    id,
    x: point.x,
    y: point.y,
    label: point.label ?? id,
  }))
}

function detectCoordMode(anchors) {
  let maxX = -Infinity
  let maxY = -Infinity

  for (const anchor of anchors) {
    maxX = Math.max(maxX, anchor.x || 0)
    maxY = Math.max(maxY, anchor.y || 0)
  }

  if (maxX <= 1 && maxY <= 1) return "fraction"
  if (maxX > 100 || maxY > 100) return "pixel"
  return "percent"
}

function toPercentAnchors(anchors, mode, imgWidth, imgHeight) {
  return anchors.map((anchor) => {
    let leftPct
    let topPct

    if (mode === "fraction") {
      leftPct = anchor.x * 100
      topPct = anchor.y * 100
    } else if (mode === "pixel") {
      leftPct = (anchor.x / imgWidth) * 100
      topPct = (anchor.y / imgHeight) * 100
    } else {
      leftPct = anchor.x
      topPct = anchor.y
    }

    return { id: anchor.id, label: anchor.label, leftPct, topPct }
  })
}

function normalizeShotTypeLabel(raw) {
  const label = String(raw || "").toLowerCase().trim()
  if (!label) return null

  if (label.includes("free") && label.includes("throw")) return "Free Throw"
  if (label.includes("off") && label.includes("dribble")) return "Off-Dribble"
  if (label.includes("catch") && label.includes("shoot")) return "Catch & Shoot"
  if (label === "catch_shoot" || label === "catchshoot") return "Catch & Shoot"
  if (label === "off_dribble" || label === "offdribble") return "Off-Dribble"

  return null
}

function isFreeThrowEvent(event) {
  const typeLower = String(event?.type || "").toLowerCase()
  const zoneId = event?.zone_id
  const shotLabel = normalizeShotTypeLabel(event?.shot_type)

  return (
    typeLower === "freethrow" ||
    shotLabel === "Free Throw" ||
    zoneId === "free_throw"
  )
}

function computeZonesFromEvents(events, { shotType, contested }) {
  if (!Array.isArray(events) || !events.length) return []

  const filtered = events.filter((event) => {
    const isFreeThrow = isFreeThrowEvent(event)
    const shotLabel = normalizeShotTypeLabel(event?.shot_type)
    const pressured = !!event?.pressured

    if (contested === "contested" && !pressured) return false
    if (contested === "uncontested" && pressured) return false

    if (shotType === "Free Throw") return isFreeThrow

    if (shotType === "Catch & Shoot" || shotType === "Off-Dribble") {
      if (isFreeThrow) return false
      return shotLabel === shotType
    }

    return true
  })

  if (!filtered.length) return []

  const zoneMap = new Map()

  function ensureZone(id, isFreeThrowZone = false) {
    if (!zoneMap.has(id)) {
      const meta = ZONES.find((zone) => zone.id === id) || { label: id }
      zoneMap.set(id, {
        id,
        label: meta.label || id,
        attempts: 0,
        makes: 0,
        volumePct: 0,
        fgPct: 0,
        isFreeThrowZone: isFreeThrowZone || id === "free_throw",
      })
    }

    return zoneMap.get(id)
  }

  for (const event of filtered) {
    const isFreeThrow = isFreeThrowEvent(event)
    const attempts =
      typeof event.attempts === "number"
        ? event.attempts
        : event.attempts
          ? Number(event.attempts)
          : 1
    const makes =
      typeof event.makes === "number" ? event.makes : event.made ? 1 : 0

    if (!attempts) continue

    if (isFreeThrow) {
      const row = ensureZone("free_throw", true)
      row.attempts += attempts
      row.makes += makes
    } else {
      const row = ensureZone(event.zone_id || "unknown", false)
      row.attempts += attempts
      row.makes += makes
    }
  }

  const zones = Array.from(zoneMap.values())
  if (!zones.length) return []

  const totalAttempts =
    shotType === "Free Throw"
      ? zones.find((zone) => zone.isFreeThrowZone)?.attempts || 0
      : zones
          .filter((zone) => !zone.isFreeThrowZone)
          .reduce((sum, zone) => sum + zone.attempts, 0)

  for (const zone of zones) {
    if (zone.attempts > 0) {
      zone.fgPct = Math.round((zone.makes / zone.attempts) * 100)
      if (totalAttempts > 0) {
        zone.volumePct = Math.round((zone.attempts / totalAttempts) * 100)
      }
    }
  }

  if (shotType === "Free Throw") {
    const freeThrowZone = zones.find((zone) => zone.isFreeThrowZone)
    return freeThrowZone && freeThrowZone.attempts ? [freeThrowZone] : []
  }

  return zones
    .filter((zone) => !zone.isFreeThrowZone && zone.attempts > 0)
    .sort((left, right) => left.label.localeCompare(right.label))
}

export function zoneDisplayValue(zone, mode) {
  if (!zone) return { label: "0 = 0%", metric: 0 }

  if (mode === "attempts") {
    const volumePct = zone.volumePct || 0
    return {
      label: `${zone.attempts} = ${volumePct}%`,
      metric: volumePct,
    }
  }

  const fgPct = zone.fgPct || 0
  return {
    label: `${zone.attempts} = ${fgPct}%`,
    metric: fgPct,
  }
}

export function useHeatmapData() {
  const [mode, setMode] = useState("attempts")
  const [source, setSource] = useState("game")
  const [shotType, setShotType] = useState("Catch & Shoot")
  const [contested, setContested] = useState("all")
  const [rangeId, setRangeId] = useState(DEFAULT_RANGE_ID)
  const [athletes, setAthletes] = useState(() => listAthletes())
  const [activeAthleteId, setActiveAthleteId] = useState(
    () => getActiveAthleteId() || "",
  )
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(false)
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })

  const anchors = useMemo(() => anchorsToArray(ZONE_ANCHORS), [])
  const coordMode = useMemo(() => detectCoordMode(anchors), [anchors])
  const percentAnchors = useMemo(() => {
    if (!imgNatural.w || !imgNatural.h) return []
    return toPercentAnchors(
      anchors,
      coordMode,
      imgNatural.w,
      imgNatural.h,
    )
  }, [anchors, coordMode, imgNatural])

  const anchorMap = useMemo(() => {
    const map = new Map()
    percentAnchors.forEach((anchor) => map.set(anchor.id, anchor))
    if (!map.has("free_throw")) {
      map.set("free_throw", {
        id: "free_throw",
        label: "Free Throw",
        leftPct: 50,
        topPct: 55,
      })
    }
    return map
  }, [percentAnchors])

  const range = useMemo(
    () => getRangeById(rangeId) || { days: 30, label: "30D" },
    [rangeId],
  )

  useEffect(() => {
    setAthletes(listAthletes())
    setActiveAthleteId(getActiveAthleteId() || "")
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        if (!activeAthleteId) {
          if (!cancelled) setZones([])
          return
        }

        const user = await getUser()
        if (!user) {
          if (!cancelled) setZones([])
          return
        }

        const table = source === "game" ? "game_events" : "practice_entries"
        let query = supabase
          .from(table)
          .select("*")
          .eq("user_id", user.id)
          .eq("athlete_id", activeAthleteId)

        if (range.days && Number.isFinite(range.days)) {
          const since = new Date(
            Date.now() - range.days * 24 * 60 * 60 * 1000,
          ).toISOString()
          query = query.gte("ts", since)
        }

        const { data, error } = range.days && Number.isFinite(range.days)
          ? await query
          : await query

        if (error) throw error

        const nextZones = computeZonesFromEvents(data || [], {
          shotType,
          contested,
        })

        if (!cancelled) setZones(nextZones)
      } catch (error) {
        console.warn("[Heatmap] load error", error)
        if (!cancelled) setZones([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [activeAthleteId, contested, range.days, shotType, source])

  const totalAttempts = useMemo(
    () => zones.reduce((sum, zone) => sum + zone.attempts, 0),
    [zones],
  )

  const handleImgLoad = (event) => {
    const image = event.currentTarget
    const width = image.naturalWidth || 0
    const height = image.naturalHeight || 0
    if (width && height) {
      setImgNatural({ w: width, h: height })
    }
  }

  const handleSelectAthlete = (athleteId) => {
    setActiveAthlete(athleteId)
    setActiveAthleteId(athleteId)
  }

  return {
    mode,
    setMode,
    source,
    setSource,
    shotType,
    setShotType,
    contested,
    setContested,
    rangeId,
    setRangeId,
    athletes,
    activeAthleteId,
    handleSelectAthlete,
    zones,
    loading,
    handleImgLoad,
    anchorMap,
    totalAttempts,
  }
}
