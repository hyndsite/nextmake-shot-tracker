import { useEffect, useMemo, useState } from "react"
import {
  addPracticeSession,
  endPracticeSession,
  listPracticeSessions,
  addEntry,
  listEntriesBySession,
  addMarker,
  updateEntry,
  deleteEntry,
} from "../lib/practice-db"
import { ZONES } from "../constants/zones"
import { SHOT_TYPES, PICKUP_TYPES, FINISH_TYPES } from "../constants/shotTypes"
import { ArrowLeft, Edit2, Trash2, X } from "lucide-react"

const ZONE_OPTIONS = ZONES.map((z) => ({ value: z.id, label: z.label }))
const SHOT_OPTIONS = SHOT_TYPES.map((s) => ({ value: s.id, label: s.label }))

const ZONE_LABEL_BY_ID = Object.fromEntries(
  ZONES.map((z) => [z.id, z.label || z.id]),
)

const FREE_THROW_ZONE_ID =
  ZONES.find(
    (z) =>
      z.id === "free_throw" ||
      (z.label && z.label.toLowerCase().includes("free throw")),
  )?.id || "free_throw"

const LAYUP_SHOT_TYPE_ID =
  SHOT_TYPES.find(
    (s) =>
      s.id === "layup" ||
      (s.label && s.label.toLowerCase().includes("layup")),
  )?.id || "layup"

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

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  )
}

export default function PracticeLog({ id, started_at, navigate }) {
  const [sessions, setSessions] = useState([])
  const [activeId, setActiveId] = useState(null)

  const [zoneId, setZoneId] = useState(ZONE_OPTIONS[0]?.value || "")
  const [shotTypeId, setShotTypeId] = useState(SHOT_OPTIONS[0]?.value || "")
  const [contested, setContested] = useState(false)

  // IMPORTANT: keep as strings to allow blank input (prevents forced "0")
  const [attempts, setAttempts] = useState("")
  const [makes, setMakes] = useState("")

  const [runningEFG, setRunningEFG] = useState(0)
  const [recentDrills, setRecentDrills] = useState([])
  const [runningMakes, setRunningMakes] = useState(0)
  const [runningAttempts, setRunningAttempts] = useState(0)

  const [pickupType, setPickupType] = useState(null)
  const [finishType, setFinishType] = useState(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [editZoneId, setEditZoneId] = useState("")
  const [editShotTypeId, setEditShotTypeId] = useState("")
  const [editContested, setEditContested] = useState(false)
  const [editAttempts, setEditAttempts] = useState("")
  const [editMakes, setEditMakes] = useState("")
  const [editPickupType, setEditPickupType] = useState(null)
  const [editFinishType, setEditFinishType] = useState(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)

  const ZONE_IS_THREE = useMemo(
    () => Object.fromEntries(ZONES.map((z) => [z.id, !!z.isThree])),
    [],
  )

  const isFreeThrowZone = zoneId === FREE_THROW_ZONE_ID
  const isLayupShotType = shotTypeId === LAYUP_SHOT_TYPE_ID

  const attemptsNum = Number(attempts || 0)
  const makesNum = Number(makes || 0)
  const invalidCounts =
    makesNum > attemptsNum || (attemptsNum === 0 && makesNum === 0)

  const editAttemptsNum = Number(editAttempts || 0)
  const editMakesNum = Number(editMakes || 0)
  
  const editInvalidCounts =
    editMakesNum > editAttemptsNum ||
    (editAttemptsNum === 0 && editMakesNum === 0)

  // Restore OLD +/- controls, but keep string state
  const dec = (setter) =>
    setter((v) => {
      const n = Number(v || 0)
      return String(Math.max(0, n - 1))
    })
  const inc = (setter) =>
    setter((v) => {
      const n = Number(v || 0)
      return String(n + 1)
    })
  const add5 = (setter) =>
    setter((v) => {
      const n = Number(v || 0)
      return String(n + 5)
    })

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

    setRecentDrills(
      entries.map((e) => ({
        ...e,
        when: new Date(e.ts).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      })),
    )
  }

  async function refresh() {
    const all = await listPracticeSessions()
    setSessions(all)
    const actives = all.filter((s) => s?.status === "active" && !s?.ended_at)
    setActiveId(id ?? actives[0]?.id ?? null)
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (id) setActiveId(id)
  }, [id])

  useEffect(() => {
    if (activeId) void refreshEFG(activeId)
  }, [activeId])

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

  const isTrulyActive =
    !!activeSession &&
    activeSession.status === "active" &&
    !activeSession.ended_at

  async function onSaveAndMarkSet() {
    if (!activeSession?.id) return
    const a = attemptsNum
    const m = makesNum
    if (a <= 0 && m <= 0) return

    const effectiveShotType = isFreeThrowZone ? null : shotTypeId
    const effectiveContested = isFreeThrowZone ? false : contested
    const isLayup = effectiveShotType === LAYUP_SHOT_TYPE_ID

    await addEntry({
      sessionId: activeSession.id,
      zoneId,
      shotType: effectiveShotType,
      contested: effectiveContested,
      attempts: a,
      makes: m,
      ts: new Date().toISOString(),
      pickupType: isLayup ? pickupType : null,
      finishType: isLayup ? finishType : null,
    })

    await addMarker({ sessionId: activeSession.id, label: "Set" })

    // Clear (blank), not forced 0
    setAttempts("")
    setMakes("")
    setPickupType(null)
    setFinishType(null)

    await refreshEFG(activeSession.id)
  }

  async function onEndActive() {
    const s = activeSession
    if (!s || s.status !== "active" || s.ended_at) return
    await endPracticeSession(s.id)
    await refresh()
    setActiveId(null)
    if (navigate) navigate("gate")
  }

  function openEditModal(row) {
    if (!row?.id) return
    const z = row.zone_id || ZONE_OPTIONS[0]?.value || ""
    const st = row.shot_type ?? ""
    const isFT = z === FREE_THROW_ZONE_ID
    const isLayup = st === LAYUP_SHOT_TYPE_ID

    setEditRow(row)
    setEditZoneId(z)
    setEditShotTypeId(st)
    setEditContested(isFT ? false : !!row.contested)
    setEditAttempts(Number(row.attempts ?? ""))
    setEditMakes(Number(row.makes ?? ""))
    setEditPickupType(isLayup ? row.pickup_type ?? null : null)
    setEditFinishType(isLayup ? row.finish_type ?? null : null)
    setEditOpen(true)
  }

  function openDeleteModal(row) {
    if (!row?.id) return
    setDeleteRow(row)
    setDeleteOpen(true)
  }

  async function onConfirmDelete() {
    if (!deleteRow?.id || !activeSession?.id) {
      setDeleteOpen(false)
      setDeleteRow(null)
      return
    }
    await deleteEntry(deleteRow.id)
    setDeleteOpen(false)
    setDeleteRow(null)
    await refreshEFG(activeSession.id)
  }

  async function onSaveEdit() {
    if (!editRow?.id || !activeSession?.id) return

    const z = editZoneId
    const isFT = z === FREE_THROW_ZONE_ID
    const effectiveShotType = isFT ? null : editShotTypeId || null
    const effectiveContested = isFT ? false : !!editContested
    const isLayup = effectiveShotType === LAYUP_SHOT_TYPE_ID

    await updateEntry({
      id: editRow.id,
      sessionId: editRow.session_id,
      zoneId: z,
      shotType: effectiveShotType,
      contested: effectiveContested,
      attempts: Number(editAttempts || 0),
      makes: Number(editMakes || 0),
      ts: editRow.ts,
      pickupType: isLayup ? editPickupType : null,
      finishType: isLayup ? editFinishType : null,
    })

    setEditOpen(false)
    setEditRow(null)
    await refreshEFG(activeSession.id)
  }

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-screen-sm mx-auto px-4 py-3 flex items-center justify-between relative">
          <button
            type="button"
            onClick={() => navigate?.("gate")}
            className="btn-back flex items-center gap-1 absolute left-4"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <h2 className="screen-title text-center flex-1">Practice Sessions</h2>
        </div>

        <p className="text-xs text-slate-500 text-center pb-1">
          Record drills quickly; save batches for analytics and goals.
        </p>
      </header>

      <main className="max-w-screen-sm mx-auto p-4 space-y-3 pb-28">
        <section className="card">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {activeList.length > 1 ? (
                <div className="flex items-center gap-2">
                  <select
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm flex-1"
                    value={activeId ?? ""}
                    onChange={(e) => setActiveId(e.target.value || null)}
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
                        <span className="text-slate-400">No active session</span>
                      )}
                    </div>
                  </div>

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

        <section className="my-2">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-600">Current Session eFG%</div>
              <div className="text-2xl font-bold text-slate-900">
                {isFinite(runningEFG) ? (runningEFG * 100).toFixed(1) : "0.0"}%
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
                  if (newZoneId === FREE_THROW_ZONE_ID) setContested(false)
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

            {isLayupShotType && !isFreeThrowZone && (
              <>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="label col-span-1">Pickup Type</label>
                  <div className="col-span-2 flex flex-wrap gap-2">
                    {PICKUP_TYPES.map((opt) => {
                      const selected = pickupType === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setPickupType(selected ? null : opt.value)
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
                    {FINISH_TYPES.map((opt) => {
                      const selected = finishType === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setFinishType(selected ? null : opt.value)
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
              <label className="label col-span-1">Contested</label>
              <button
                type="button"
                onClick={() => {
                  if (isFreeThrowZone) return
                  setContested((p) => !p)
                }}
                disabled={isFreeThrowZone}
                className={`btn h-10 rounded-lg text-sm font-medium ${
                  contested ? "btn-emerald" : "btn-outline-emerald"
                } ${isFreeThrowZone ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {isFreeThrowZone
                  ? "N/A"
                  : contested
                  ? "Contested"
                  : "Uncontested"}
              </button>
            </div>

            {/* Attempts (restored OLD +/- UI) */}
            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Attempts</label>
              <div className="qty-row col-span-2">
                <div className="qty-group flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => dec(setAttempts)}
                    className="btn btn-blue btn-xs"
                    aria-label="Decrease attempts"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={attempts}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === "") return setAttempts("")
                      const n = Math.max(0, Number(v))
                      setAttempts(String(isFinite(n) ? n : 0))
                    }}
                    className="input-qty"
                  />
                  <button
                    type="button"
                    onClick={() => inc(setAttempts)}
                    className="btn btn-blue btn-xs"
                    aria-label="Increase attempts"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => add5(setAttempts)}
                    className="btn btn-blue btn-xs"
                    aria-label="Add 5 attempts"
                  >
                    +5
                  </button>
                </div>
              </div>
            </div>

            {/* Makes (restored OLD +/- UI) */}
            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Makes</label>
              <div className="qty-row col-span-2">
                <div className="qty-group flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => dec(setMakes)}
                    className="btn btn-blue btn-xs"
                    aria-label="Decrease makes"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={makes}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === "") return setMakes("")
                      const n = Math.max(0, Number(v))
                      setMakes(String(isFinite(n) ? n : 0))
                    }}
                    className="input-qty"
                  />
                  <button
                    type="button"
                    onClick={() => inc(setMakes)}
                    className="btn btn-blue btn-xs"
                    aria-label="Increase makes"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => add5(setMakes)}
                    className="btn btn-blue btn-xs"
                    aria-label="Add 5 makes"
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

        {recentDrills.length > 0 && (
          <section className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-sm font-semibold text-slate-900 mb-2">
              This Session – Logged Drills
            </div>

            <ul className="space-y-2">
              {recentDrills.map((d) => {
                const zoneLabel =
                  ZONE_LABEL_BY_ID[d.zone_id] || d.zone_id || "Unknown"
                const isFT = d.zone_id === FREE_THROW_ZONE_ID
                const shotLabel = d.shot_type || (isFT ? "Free Throw" : "—")

                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between text-sm gap-3"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-slate-900 truncate">
                        {shotLabel} • {zoneLabel}
                      </span>
                      <span className="text-slate-500">{d.when}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="font-medium text-slate-900 tabular-nums">
                        {d.makes}/{d.attempts}
                      </div>

                      <button
                        type="button"
                        onClick={() => openEditModal(d)}
                        className="edit-btn p-1 rounded-full hover:bg-slate-100"
                        aria-label="Edit practice entry"
                        title="Edit"
                      >
                        <Edit2 size={14} className="text-slate-500" />
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(d)}
                        className="trash-btn p-1 rounded-full hover:bg-slate-100"
                        aria-label="Delete practice entry"
                        title="Delete"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </main>

      {editOpen && (
        <ModalShell
          title="Edit Practice Entry"
          onClose={() => {
            setEditOpen(false)
            setEditRow(null)
          }}
        >
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Zone</label>
              <select
                className="input col-span-2"
                value={editZoneId}
                onChange={(e) => {
                  const newZoneId = e.target.value
                  setEditZoneId(newZoneId)
                  if (newZoneId === FREE_THROW_ZONE_ID) {
                    setEditContested(false)
                    setEditShotTypeId("")
                    setEditPickupType(null)
                    setEditFinishType(null)
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
                value={editShotTypeId}
                onChange={(e) => {
                  const v = e.target.value
                  setEditShotTypeId(v)
                  if (v !== LAYUP_SHOT_TYPE_ID) {
                    setEditPickupType(null)
                    setEditFinishType(null)
                  }
                }}
                disabled={editZoneId === FREE_THROW_ZONE_ID}
              >
                {SHOT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {editZoneId !== FREE_THROW_ZONE_ID &&
              editShotTypeId === LAYUP_SHOT_TYPE_ID && (
                <>
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="label col-span-1">Pickup Type</label>
                    <div className="col-span-2 flex flex-wrap gap-2">
                      {PICKUP_TYPES.map((opt) => {
                        const selected = editPickupType === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setEditPickupType(selected ? null : opt.value)
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
                      {FINISH_TYPES.map((opt) => {
                        const selected = editFinishType === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setEditFinishType(selected ? null : opt.value)
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
              <label className="label col-span-1">Contested</label>
              <button
                type="button"
                onClick={() => {
                  if (editZoneId === FREE_THROW_ZONE_ID) return
                  setEditContested((p) => !p)
                }}
                disabled={editZoneId === FREE_THROW_ZONE_ID}
                className={`btn h-10 rounded-lg text-sm font-medium ${
                  editContested ? "btn-emerald" : "btn-outline-emerald"
                } ${
                  editZoneId === FREE_THROW_ZONE_ID
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }`}
              >
                {editZoneId === FREE_THROW_ZONE_ID
                  ? "N/A"
                  : editContested
                  ? "Contested"
                  : "Uncontested"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Attempts</label>
              <input
              type="number"
              inputMode="numeric"
              min={0}
              value={editAttempts}
              onChange={(e) => {
                const v = e.target.value
                if (v === "") return setEditAttempts("")
                const n = Math.max(0, Number(v))
                setEditAttempts(String(isFinite(n) ? n : 0))
              }}
              className="input col-span-2"
            />

            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="label col-span-1">Makes</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={editMakes}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === "") return setEditMakes("")
                  const n = Math.max(0, Number(v))
                  setEditMakes(String(isFinite(n) ? n : 0))
                }}
                className="input col-span-2"
              />

            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn h-10 rounded-lg text-sm font-medium border border-slate-200 bg-white"
                onClick={() => {
                  setEditOpen(false)
                  setEditRow(null)
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-emerald h-10 rounded-lg text-sm font-medium"
                disabled={editInvalidCounts}
                onClick={onSaveEdit}
              >
                Save Changes
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {deleteOpen && (
        <ModalShell
          title="Delete Practice Entry"
          onClose={() => {
            setDeleteOpen(false)
            setDeleteRow(null)
          }}
        >
          <div className="text-sm text-slate-700">
            You are about to delete this practice entry from the session. This
            action will sync to Supabase when online.
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              type="button"
              className="btn h-10 rounded-lg text-sm font-medium border border-slate-200 bg-white"
              onClick={() => {
                setDeleteOpen(false)
                setDeleteRow(null)
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger h-10 rounded-lg text-sm font-medium"
              onClick={onConfirmDelete}
            >
              OK
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
