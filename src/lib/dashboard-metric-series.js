const RANGE_TO_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "1y": 365,
}

const RIM_ZONE_IDS = new Set(["rim", "at_rim", "paint", "restricted_area"])

function asDate(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

function toDayStart(value) {
  const d = asDate(value)
  if (!d) return null
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function dayKey(value) {
  const d = toDayStart(value)
  if (!d) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function emptyAgg() {
  return { attempts: 0, makes: 0, threes: 0, rimAttempts: 0 }
}

function metricValue(metricKey, agg) {
  const attempts = agg.attempts || 0
  const makes = agg.makes || 0
  const threes = agg.threes || 0
  const rimAttempts = agg.rimAttempts || 0

  if (metricKey === "total_attempts") return attempts
  if (metricKey === "total_makes") return makes
  if (!attempts) return 0

  if (metricKey === "efg_overall") return ((makes + 0.5 * threes) / attempts) * 100
  if (metricKey === "fg_overall") return (makes / attempts) * 100
  if (metricKey === "shot_share_3pa") return (threes / attempts) * 100
  if (metricKey === "shot_share_rim") return (rimAttempts / attempts) * 100
  return 0
}

function addGameShot(map, shot) {
  const key = dayKey(shot?.ts)
  if (!key) return
  const agg = map.get(key) || emptyAgg()
  agg.attempts += 1
  agg.makes += shot?.made ? 1 : 0
  agg.threes += shot?.is_three ? 1 : 0
  if (RIM_ZONE_IDS.has(String(shot?.zone_id || "").toLowerCase())) {
    agg.rimAttempts += 1
  }
  map.set(key, agg)
}

function addPracticeRow(map, row) {
  const key = dayKey(row?.ts)
  if (!key) return
  const attempts = Math.max(0, Number(row?.attempts || 0))
  const makes = Math.max(0, Number(row?.makes || 0))
  if (!attempts) return
  const agg = map.get(key) || emptyAgg()
  agg.attempts += attempts
  agg.makes += Math.min(makes, attempts)
  if (RIM_ZONE_IDS.has(String(row?.zone_id || "").toLowerCase())) {
    agg.rimAttempts += attempts
  }
  map.set(key, agg)
}

function buildDayKeys(rangeKey, now) {
  const days = RANGE_TO_DAYS[rangeKey] || RANGE_TO_DAYS["7d"]
  const end = toDayStart(now || new Date())
  const out = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    out.push(dayKey(d))
  }
  return out
}

function interpolateMissing(values) {
  const out = [...values]
  const knownIndexes = []

  for (let i = 0; i < out.length; i += 1) {
    if (out[i] != null) knownIndexes.push(i)
  }
  if (!knownIndexes.length) {
    return out.map(() => 0)
  }

  const firstKnownIndex = knownIndexes[0]
  const firstKnownValue = out[firstKnownIndex]
  for (let i = 0; i < firstKnownIndex; i += 1) {
    out[i] = firstKnownValue
  }

  for (let k = 0; k < knownIndexes.length - 1; k += 1) {
    const startIndex = knownIndexes[k]
    const endIndex = knownIndexes[k + 1]
    const startValue = out[startIndex]
    const endValue = out[endIndex]
    const steps = endIndex - startIndex
    if (steps <= 1) continue

    for (let i = startIndex + 1; i < endIndex; i += 1) {
      const t = (i - startIndex) / steps
      out[i] = startValue + (endValue - startValue) * t
    }
  }

  const lastKnownIndex = knownIndexes[knownIndexes.length - 1]
  const lastKnownValue = out[lastKnownIndex]
  for (let i = lastKnownIndex + 1; i < out.length; i += 1) {
    out[i] = lastKnownValue
  }

  return out
}

export function buildDashboardMetricSeries({
  metricKey,
  rangeKey,
  sourceMode,
  gameEvents = [],
  practiceEntries = [],
  now,
}) {
  const gameByDay = new Map()
  const practiceByDay = new Map()

  for (const ev of gameEvents) {
    if (ev?.type !== "shot") continue
    addGameShot(gameByDay, ev)
  }

  for (const row of practiceEntries) {
    addPracticeRow(practiceByDay, row)
  }

  const dayKeys = buildDayKeys(rangeKey, now)
  const rawPoints = dayKeys.map((key) => {
    const gameAgg = gameByDay.get(key) || emptyAgg()
    const practiceAgg = practiceByDay.get(key) || emptyAgg()

    const hasGameData = gameAgg.attempts > 0
    const hasPracticeData = practiceAgg.attempts > 0

    const game = hasGameData ? metricValue(metricKey, gameAgg) : null
    const practice = hasPracticeData ? metricValue(metricKey, practiceAgg) : null
    const totalAgg = {
      attempts: gameAgg.attempts + practiceAgg.attempts,
      makes: gameAgg.makes + practiceAgg.makes,
      threes: gameAgg.threes + practiceAgg.threes,
      rimAttempts: gameAgg.rimAttempts + practiceAgg.rimAttempts,
    }
    const hasTotalData = totalAgg.attempts > 0

    let total = hasTotalData ? metricValue(metricKey, totalAgg) : null
    if (sourceMode === "game") total = game
    if (sourceMode === "practice") total = practice

    return {
      dayKey: key,
      game,
      practice,
      total,
    }
  })

  const gameValues = interpolateMissing(rawPoints.map((point) => point.game))
  const practiceValues = interpolateMissing(rawPoints.map((point) => point.practice))
  const totalValues = interpolateMissing(rawPoints.map((point) => point.total))

  const points = rawPoints.map((point, index) => ({
    ...point,
    game: gameValues[index],
    practice: practiceValues[index],
    total: totalValues[index],
  }))

  return {
    metricKey,
    rangeKey,
    sourceMode,
    points,
  }
}

export { RANGE_TO_DAYS }
