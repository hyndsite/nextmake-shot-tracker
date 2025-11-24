import { useEffect, useMemo, useState } from "react"
import {
  addPracticeSession,
  endPracticeSession,
  listPracticeSessions,
  addEntry,
  listEntriesBySession,
  addMarker,
} from "../lib/practice-db"
import { ZONES } from "../constants/zones"
import { SHOT_TYPES } from "../constants/shotTypes"
import { ArrowLeft } from "lucide-react"

const ZONE_OPTIONS = ZONES.map((z) => ({ value: z.id, label: z.label }))
const SHOT_OPTIONS = SHOT_TYPES.map((s) => ({ value: s.id, label: s.label }))

// Map for pretty zone labels in the drill list
const ZONE_LABEL_BY_ID = Object.fromEntries(
  ZONES.map((z) => [z.id, z.label || z.id]),
)

// Try to detect the free-throw zone ID from ZONES; fall back to "free_throw"
const FREE_THROW_ZONE_ID =
  ZONES.find(
    (z) =>
      z.id === "free_throw" ||
      (z.label && z.label.toLowerCase().includes("free throw")),
  )?.id || "free_throw"

// Try to detect the layup shot type from SHOT_TYPES; fall back to "layup"
const LAYUP_SHOT_TYPE_ID =
  SHOT_TYPES.find(
    (s) =>
      s.id === "layup" ||
      (s.label && s.label.toLowerCase().includes("layup")),
  )?.id || "layup"

// Layup metadata options (practice side)
const LAYUP_PICKUP_TYPES = [
  { value: "low_pickup", label: "Low Pickup" },
  { value: "football", label: "Football" },
  { value: "overhead", label: "Overhead" },
]

const LAYUP_FINISH_TYPES = [
  { value: "underhand", label: "Underhand" },
  { value: "overhand", label: "Overhand" },
]

function fmtDT(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso || "—"
  }
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"],
    v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function formatSessionHeader(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  const weekday = d.toLocaleDateString(undefined, { weekday: "long" })
  const mon = d.toLocaleDateString(undefined, { month: "short" })
  const day = ordinal(d.getDate())
  const yr = d.getFullYear()
  return `${weekday} | ${mon} ${day} | ${yr}.`
}

export default function PracticeLog({ id, started_at, navigate }) {
  const [sessions, setSessions] = useState([])
  const [activeId, setActiveId] = useState(null)

  // form state
  const [zoneId, setZoneId] = useState(ZONE_OPTIONS[0]?.value || "")
  const [shotTypeId, setShotTypeId] = useState(SHOT_OPTIONS[0]?.value || "")
  const [pressured, setPressured] = useState(false)
  const [attempts, setAttempts] = useState(10)
  const [makes, setMakes] = useState(4)
  const [runningEFG, setRunningEFG] = useState(0)
  const [recentDrills, setRecentDrills] = useState([])

  const [runningMakes, setRunningMakes] = useState(0)
  const [runningAttempts, setRunningAttempts] = useState(0)

  // NEW: layup metadata for practice entries
  const [pickupType, setPickupType] = useState(null)
  const [finishType, setFinishType] = useState(null)

  // is current zone the Free Throw zone?
  const isFreeThrowZone = zoneId === FREE_THROW_ZONE_ID
  const isLayupShotType = shotTypeId === LAYUP_SHOT_TYPE_ID

  // +/- handlers
  const dec = (setter) => setter((v) => Math.max(0, Number(v || 0) - 1))
  const inc = (setter) => setter((v) => Number(v || 0) + 1)
  const add5 = (setter) => setter((v) => Number(v || 0) + 5)
  const invalidCounts = makes > attempts || (attempts === 0 && makes === 0)

  // helper for 3PT lookup
  const ZONE_IS_THREE = useMemo(
    () => Object.fromEntries(ZONES.map((z) => [z.id, !!z.isThree])),
    [],
  )

  // 🔄 recompute running eFG% for the active session
  async function refreshEFG(sessionId) {
    if (!sessionId) {
      setRunningEFG(0)
      setRunningMakes(0)
      setRunningAttempts(0)
      setRecentDrills([])
      return
    }

    const entries = await listEntriesBySession(sessionId)
    let A = 0,
      M = 0,
      TM = 0
    for (const e of entries) {
      const a = Number(e.attempts || 0)
      const m = Number(e.makes || 0)
      A += a
      M += m
      if (ZONE_IS_THREE[e.zone_id]) TM += m
    }
    const efg = A ? (M + 0.5 * TM) / A : 0

    setRunningEFG(efg)
    setRunningMakes(M)
    setRunningAttempts(A)

    // Also repopulate the recent drills list
    setRecentDrills(
      entries.map((e) => ({
        id: e.id,
        when: new Date(e.ts).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        zoneId: e.zone_id,
        shotType: e.shot_type,
        attempts: e.attempts,
        makes: e.makes,
      })),
    )
  }

  async function refresh() {
    const all = await listPracticeSessions()
    setSessions(all)
    const actives = all.filter((s) => s?.status === "active" && !s?.ended_at)

    // prefer explicit id from navigation, else pick first active (if any)
    setActiveId(id ?? actives[0]?.id ?? null)
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (id) setActiveId(id)
  }, [id])

  // call refreshEFG whenever activeId changes or after a save
  useEffect(() => {
    if (activeId) void refreshEFG(activeId)
  }, [activeId])

  // 📝 Save & Mark Set
  async function onSaveAndMarkSet() {
    if (!activeSession?.id) return
    const a = Number(attempts || 0)
    const m = Number(makes || 0)
    if (a <= 0 && m <= 0) return // nothing to save

    // For Free Throws in practice:
    // - shot_type should be null
    // - pressured should be false
    const effectiveShotType = isFreeThrowZone ? null : shotTypeId
    const effectivePressured = isFreeThrowZone ? false : pressured

    // For layup shot type, we also send pickupType/finishType
    const isLayup = effectiveShotType === LAYUP_SHOT_TYPE_ID

    const entry = await addEntry({
      sessionId: activeSession.id,
      zoneId,
      shotType: effectiveShotType,
      pressured: effectivePressured,
      attempts: a,
      makes: m,
      ts: new Date().toISOString(),
      pickupType: isLayup ? pickupType : null,
      finishType: isLayup ? finishType : null,
    })

    await addMarker({ sessionId: activeSession.id, label: "Set" })

    // Append locally
    setRecentDrills((prev) => [
      ...prev,
      {
        id: entry.id,
        when: new Date(entry.ts).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        zoneId: entry.zone_id,
        shotType: entry.shot_type,
        attempts: entry.attempts,
        makes: entry.makes,
      },
    ])

    // reset inputs
    setAttempts(0)
    setMakes(0)
    // reset layup metadata so they don't bleed into the next set
    setPickupType(null)
    setFinishType(null)

    // refresh running eFG
    await refreshEFG(activeSession.id)
  }

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) || null,
    [sessions, activeId],
  )

  const activeList = useMemo(
    () =>
      sessions
        .filter((s) => s?.status === "active" && !s?.ended_at)
        .sort((a, b) =>
          (b.started_at || "").localeCompare(a.started_at || ""),
        ),
    [sessions],
  )

  async function onEndActive() {
    const s = activeSession
    // Only end if the session is truly active
    if (!s || s.status !== "active" || s.ended_at) return

    await endPracticeSession(s.id)
    await refresh()
    setActiveId(null)

    if (navigate) navigate("gate")
  }

  async function onSwitchActive(id) {
    setActiveId(id || null)
  }

  const isTrulyActive =
    !!activeSession &&
    activeSession.status === "active" &&
    !activeSession.ended_at

  return (
    <div className="min-h-dvh bg-white">
      {/* Header with back + centered title */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-screen-sm mx-auto px-4 py-3 flex items-center justify-between relative">
          {/* Back Button - aligned left */}
          <button
            type="button"
            onClick={() => navigate?.("gate")}
            className="btn-back flex items-center gap-1 absolute left-4"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>

          {/* Centered Title */}
          <h2 className="screen-title text-center flex-1">
            Practice Sessions
          </h2>
        </div>

        <p className="text-xs text-slate-500 text-center pb-1">
          Record drills quickly; save batches for analytics and goals.
        </p>
      </header>

      <main className="max-w-screen-sm mx-auto p-4 space-y-3 pb-28">
        {/* Session controls */}
        <section className="card">
          <div className="flex flex-col gap-3">
            {/* Active section */}
            <div className="flex flex-col gap-2">
              {activeList.length > 1 ? (
                // Multiple truly active sessions – selector
                <div className="flex items-center gap-2">
                  <select
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm flex-1"
                    value={activeId ?? ""}
                    onChange={(e) => onSwitchActive(e.target.value || null)}
                    aria-label="Switch active session"
                  >
                    {activeList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {fmtDT(s.started_at)} (Active)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                // Single or none
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-base font-semibold text-slate-900">
                      {activeSession
                        ? isTrulyActive
                          ? "Active Session"
                          : "Session Ended"
                        : "Active Session"}
                    </div>
                    <div className="text-sm text-slate-700">
                      {activeSession ? (
                        formatSessionHeader(
                          started_at || activeSession.started_at,
                        )
                      ) : (
                        <span className="text-slate-400">
                          No active session
                        </span>
                      )}
                    </div>
                  </div>

                  {/* End Session only if truly active */}
                  {isTrulyActive && (
                    <button
                      type="button"
                      onClick={onEndActive}
                      className="btn btn-danger h-9 px-3 text-xs font-semibold shadow-sm"
                      aria-label="End active session"
                    >
                      End Session
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Current Session eFG% pill */}
        <section className="my-2">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-600">
                Current Session eFG%
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {isFinite(runningEFG)
                  ? (runningEFG * 100).toFixed(1)
                  : "0.0"}
                %
              </div>
            </div>
            <div className="text-right text-sm text-slate-600">
              <div>
                Total Shots:{" "}
                <span className="font-semibold text-slate-900">
                  {runningAttempts}
                </span>
              </div>
              <div>
                Total Makes:{" "}
                <span className="font-semibold text-slate-900">
                  {runningMakes}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Entry form */}
        <section className="card">
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Zone</label>
              <select
                className="input col-span-2"
                value={zoneId}
                onChange={(e) => {
                  const newZoneId = e.target.value
                  setZoneId(newZoneId)
                  // If user switches into Free Throw zone, ensure
                  // pressured is false; shot type will be ignored on save.
                  if (newZoneId === FREE_THROW_ZONE_ID) {
                    setPressured(false)
                  }
                }}
              >
                {ZONE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Shot Type</label>
              <select
                className="input col-span-2"
                value={shotTypeId}
                onChange={(e) => {
                  const v = e.target.value
                  setShotTypeId(v)
                  // If leaving layup, clear layup metadata so it's not reused accidentally
                  if (v !== LAYUP_SHOT_TYPE_ID) {
                    setPickupType(null)
                    setFinishType(null)
                  }
                }}
                disabled={isFreeThrowZone}
              >
                {SHOT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Layup metadata: pickup + finish, only when layup shot type (and not FT zone) */}
            {isLayupShotType && !isFreeThrowZone && (
              <>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="label col-span-1">Pickup Type</label>
                  <div className="col-span-2 flex flex-wrap gap-2">
                    {LAYUP_PICKUP_TYPES.map((opt) => {
                      const selected = pickupType === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setPickupType(
                              selected ? null : opt.value,
                            )
                          }
                          className={`btn btn-xs ${
                            selected ? "btn-emerald" : "btn-outline-emerald"
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="label col-span-1">Finish Type</label>
                  <div className="col-span-2 flex flex-wrap gap-2">
                    {LAYUP_FINISH_TYPES.map((opt) => {
                      const selected = finishType === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setFinishType(
                              selected ? null : opt.value,
                            )
                          }
                          className={`btn btn-xs ${
                            selected ? "btn-emerald" : "btn-outline-emerald"
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Pressured</label>
              <button
                type="button"
                onClick={() => {
                  if (isFreeThrowZone) return
                  setPressured((p) => !p)
                }}
                disabled={isFreeThrowZone}
                className={`btn h-10 rounded-lg text-sm font-medium ${
                  pressured ? "btn-emerald" : "btn-outline-emerald"
                } ${isFreeThrowZone ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {isFreeThrowZone
                  ? "N/A for Free Throws"
                  : pressured
                  ? "Contested"
                  : "Uncontested"}
              </button>
            </div>

            {/* Attempts */}
            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Attempts</label>
              <div className="qty-row">
                <div className="qty-group">
                  <button
                    type="button"
                    onClick={() => dec(setAttempts)}
                    className="btn btn-blue btn-xs"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={attempts}
                    onChange={(e) =>
                      setAttempts(
                        Math.max(0, Number(e.target.value || 0)),
                      )
                    }
                    className="input-qty"
                  />
                  <button
                    type="button"
                    onClick={() => inc(setAttempts)}
                    className="btn btn-blue btn-xs"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => add5(setAttempts)}
                    className="btn btn-blue btn-xs"
                  >
                    +5
                  </button>
                </div>
              </div>
            </div>

            {/* Makes */}
            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Makes</label>
              <div className="qty-row">
                <div className="qty-group">
                  <button
                    type="button"
                    onClick={() => dec(setMakes)}
                    className="btn btn-blue btn-xs"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={makes}
                    onChange={(e) =>
                      setMakes(
                        Math.max(0, Number(e.target.value || 0)),
                      )
                    }
                    className="input-qty"
                  />
                  <button
                    type="button"
                    onClick={() => inc(setMakes)}
                    className="btn btn-blue btn-xs"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => add5(setMakes)}
                    className="btn btn-blue btn-xs"
                  >
                    +5
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onSaveAndMarkSet}
                disabled={!activeSession || invalidCounts}
                className="btn btn-emerald h-10 rounded-lg text-sm font-medium"
              >
                Save &amp; Mark Set
              </button>
            </div>
          </div>
        </section>

        {/* Logged drills for this session */}
        {recentDrills.length > 0 && (
          <section className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-sm font-semibold text-slate-900 mb-2">
              This Session – Logged Drills
            </div>
            <ul className="space-y-2">
              {recentDrills.map((d) => {
                const zoneLabel =
                  ZONE_LABEL_BY_ID[d.zoneId] || d.zoneId || "Unknown"
                const isFT = d.zoneId === FREE_THROW_ZONE_ID
                const shotLabel = d.shotType || (isFT ? "Free Throw" : "—")
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="text-slate-900">
                        {shotLabel} • {zoneLabel}
                      </span>
                      <span className="text-slate-500">{d.when}</span>
                    </div>
                    <div className="font-medium text-slate-900">
                      {d.makes}/{d.attempts}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
