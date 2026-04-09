import { Archive, ArrowLeftRight, Plus } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  DASHBOARD_METRIC_GROUPS,
} from "../constants/dashboard-metrics"
import {
  fmtPct,
  fmtValue,
  fullName,
  pct,
  zoneLabel,
} from "../lib/dashboard-formatters"
import { useDashboardData } from "../hooks/useDashboardData"
import { useDashboardAthleteActions } from "../hooks/useDashboardAthleteActions"
import {
  useDashboardCustomization,
} from "../hooks/useDashboardCustomization"
import { useDashboardMetricCards } from "../hooks/useDashboardMetricCards"

function Avatar({ athlete }) {
  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold text-slate-800 shrink-0"
      style={{ backgroundColor: athlete?.avatar_color || "#E2E8F0" }}
      aria-hidden="true"
    >
      {athlete?.initials || "NA"}
    </div>
  )
}

function AthleteRow({ athlete, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2 flex items-center gap-3 text-left transition active:scale-[0.99] ${
        selected
          ? "border-sky-600 bg-sky-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <Avatar athlete={athlete} />
      <div className="text-sm font-medium text-slate-900 truncate">{fullName(athlete)}</div>
    </button>
  )
}

const RANGE_OPTIONS = ["7d", "30d", "90d", "180d", "1y"]

export default function Dashboard() {
  const {
    athletes,
    athletesError,
    activeAthleteId: activeId,
    activeAthlete,
    refreshAthletes,
    selectAthlete,
    snapshot,
    snapshotLoading,
    gameRows,
    practiceRows,
    dashboardMetrics,
    setDashboardMetrics,
    dashboardMetricsLoading,
    dashboardMetricsError,
  } = useDashboardData()
  const {
    showSwitch,
    setShowSwitch,
    showAdd,
    setShowAdd,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    error,
    handleSelectAthlete,
    handleAddAthlete,
    handleArchiveAthlete,
  } = useDashboardAthleteActions({
    activeAthlete,
    refreshAthletes,
    selectAthlete,
  })
  const {
    dashboardActionError,
    showCustomize,
    draftMetrics,
    draftError,
    savingDashboardMetrics,
    removingMetricPosition,
    openCustomizeDrawer,
    closeCustomizeDrawer,
    updateDraftMetric,
    addDraftMetric,
    removeDraftMetric,
    removeConfiguredMetric,
    sourceFlags,
    toSourceMode,
  } = useDashboardCustomization({
    activeAthleteId: activeId,
    dashboardMetrics,
    setDashboardMetrics,
  })
  const { configuredMetricCards, dashboardMetricsSubtitle } = useDashboardMetricCards({
    dashboardMetrics,
    gameRows,
    practiceRows,
  })

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-screen-sm mx-auto px-4 py-3">
          <h2 className="screen-title">Dashboard</h2>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto p-4 pb-24 space-y-4">
        <section className="card space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="min-w-0 rounded-2xl border border-slate-300 bg-white p-[2px] shadow-sm">
              <div
                className="rounded-[14px] p-[2px]"
                style={{ backgroundColor: activeAthlete?.avatar_color || "#CBD5E1" }}
              >
                <div className="rounded-xl bg-gradient-to-r from-white to-slate-50 px-2.5 py-2 flex items-center gap-2.5">
                  <Avatar athlete={activeAthlete} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Active athlete
                    </div>
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {fullName(activeAthlete)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              role="group"
              aria-label="Active athlete actions"
              className="flex items-center justify-end gap-1.5 shrink-0"
            >
              <button
                type="button"
                className="h-9 w-9 p-0 rounded-full border border-sky-300 bg-sky-50 text-sky-700 inline-flex items-center justify-center shadow-sm transition hover:bg-sky-100"
                onClick={() => setShowSwitch((v) => !v)}
                aria-label="Switch athlete"
                title="Switch athlete"
              >
                <ArrowLeftRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              </button>

              <button
                type="button"
                className="h-9 w-9 p-0 rounded-full border-2 border-emerald-600 bg-white text-emerald-600 inline-flex items-center justify-center shadow-sm transition hover:bg-emerald-50"
                onClick={() => setShowAdd((v) => !v)}
                aria-label="Open add athlete"
                title="Add athlete"
              >
                <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              </button>

              <button
                type="button"
                className="h-9 w-9 p-0 rounded-full border border-amber-500 bg-white text-amber-600 inline-flex items-center justify-center shadow-sm transition hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={handleArchiveAthlete}
                aria-label="Archive athlete"
                title="Archive athlete"
                disabled={!activeAthlete}
              >
                <Archive className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {showSwitch && (
            <div className="space-y-2" aria-label="Athlete list">
              {athletes.length === 0 && (
                <div className="text-sm text-slate-500">No athlete profiles yet.</div>
              )}
              {athletes.map((athlete) => (
                <AthleteRow
                  key={athlete.id}
                  athlete={athlete}
                  selected={athlete.id === activeId}
                  onClick={() => handleSelectAthlete(athlete.id)}
                />
              ))}
            </div>
          )}

          {showAdd && (
            <form className="space-y-2" onSubmit={handleAddAthlete}>
              <div>
                <label className="label" htmlFor="athlete-first-name">First name</label>
                <input
                  id="athlete-first-name"
                  className="input"
                  value={firstName}
                  maxLength={20}
                  required
                  onChange={(e) => setFirstName(e.target.value.slice(0, 20))}
                />
              </div>
              <div>
                <label className="label" htmlFor="athlete-last-name">Last name (optional)</label>
                <input
                  id="athlete-last-name"
                  className="input"
                  value={lastName}
                  maxLength={20}
                  onChange={(e) => setLastName(e.target.value.slice(0, 20))}
                />
              </div>
              {(error || athletesError) && <p className="text-sm text-red-600">{error || athletesError}</p>}
              <button type="submit" className="btn btn-blue w-full">Add athlete</button>
            </form>
          )}
        </section>

        <section className="card space-y-3">
          <div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Dashboard Metrics</h3>
              <div className="text-xs text-slate-500">{dashboardMetricsSubtitle}</div>
            </div>
          </div>
          {dashboardMetricsLoading && (
            <div className="text-xs text-slate-500">Loading dashboard metrics...</div>
          )}
          {(dashboardActionError || dashboardMetricsError) && (
            <div className="text-xs text-red-600">{dashboardActionError || dashboardMetricsError}</div>
          )}
          {configuredMetricCards.length > 0 && (
            <div className="space-y-2">
              {configuredMetricCards.map((card) => (
                <div key={card.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">{card.label}</div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-slate-500">
                        {card.rangeKey} • {card.sourceLabel}
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-600 disabled:opacity-50"
                        aria-label={`Remove ${card.label}`}
                        onClick={() => removeConfiguredMetric(card.position)}
                        disabled={removingMetricPosition === card.position}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={120}>
                      <LineChart data={card.series.points}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="dayKey" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value) => fmtValue(value, card.format)} />
                        {(card.sourceMode === "both" || card.sourceMode === "game") && (
                          <Line
                            type="monotone"
                            dataKey="game"
                            stroke="#0EA5E9"
                            dot={false}
                            strokeWidth={2}
                            name="Game"
                          />
                        )}
                        {(card.sourceMode === "both" || card.sourceMode === "practice") && (
                          <Line
                            type="monotone"
                            dataKey="practice"
                            stroke="#10B981"
                            dot={false}
                            strokeWidth={2}
                            name="Practice"
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}
          {configuredMetricCards.length < 5 && (
            <button
              type="button"
              className="group w-1/2 aspect-square rounded-2xl border-2 border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 text-sm font-semibold text-slate-700 shadow-[0_5px_12px_-9px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.85)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_14px_-10px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] active:translate-y-0 active:shadow-[0_3px_8px_-7px_rgba(15,23,42,0.32),inset_0_1px_0_rgba(255,255,255,0.8)]"
              onClick={openCustomizeDrawer}
            >
              <span className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/80 px-3 py-1 shadow-sm">
                + Add Metric
              </span>
            </button>
          )}
        </section>

        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Performance Snapshot</h3>
            {snapshotLoading && <span className="text-xs text-slate-500">Updating...</span>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">eFG% (7d)</div>
              <div className="text-lg font-semibold text-slate-900">{fmtPct(snapshot.efgPct7d)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">FG% (7d)</div>
              <div className="text-lg font-semibold text-slate-900">{fmtPct(snapshot.fgPct7d)}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Shots Today</div>
              <div className="text-base font-semibold text-slate-900">{snapshot.attemptsToday}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Shots (7d)</div>
              <div className="text-base font-semibold text-slate-900">{snapshot.attempts7d}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Streak</div>
              <div className="text-base font-semibold text-slate-900">{snapshot.streakDays}d</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Makes / Attempts (7d)</div>
              <div className="text-sm font-semibold text-slate-900">
                {snapshot.makes7d} / {snapshot.attempts7d} ({fmtPct(pct(snapshot.makes7d, snapshot.attempts7d))})
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Practice vs Game (7d)</div>
              <div className="text-sm font-semibold text-slate-900">
                P {snapshot.practiceAttempts7d} • G {snapshot.gameAttempts7d}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Top Zone (7d)</div>
              <div className="text-sm font-semibold text-slate-900">
                {snapshot.topZone
                  ? `${zoneLabel(snapshot.topZone.zoneId)} · ${fmtPct(snapshot.topZone.fgPct)}`
                  : "Not enough shots"}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Weakest Zone (7d)</div>
              <div className="text-sm font-semibold text-slate-900">
                {snapshot.weakestZone
                  ? `${zoneLabel(snapshot.weakestZone.zoneId)} · ${fmtPct(snapshot.weakestZone.fgPct)}`
                  : "Not enough shots"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Last Session</div>
              <div className="text-sm font-semibold text-slate-900">
                {snapshot.lastSession
                  ? `${snapshot.lastSession.source === "game" ? "Game" : "Practice"} · ${zoneLabel(snapshot.lastSession.zoneId)} · ${snapshot.lastSession.makes}/${snapshot.lastSession.attempts}`
                  : "No sessions yet"}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Current Goal Progress</div>
              <div className="text-sm font-semibold text-slate-900">
                {snapshot.goalSummary
                  ? `${snapshot.goalSummary.progressPct}% · ${snapshot.goalSummary.setName}`
                  : "No active goals"}
              </div>
            </div>
          </div>
        </section>
      </main>

      {showCustomize && (
        <div className="fixed inset-0 z-30">
          <button
            type="button"
            aria-label="Close customize dashboard"
            className="absolute inset-0 bg-slate-900/30"
            onClick={closeCustomizeDrawer}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-xl border-l border-slate-200 flex flex-col">
            <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Customize Dashboard</h3>
                <p className="text-xs text-slate-500">{fullName(activeAthlete)}</p>
              </div>
              <button
                type="button"
                className="h-8 rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-700"
                onClick={closeCustomizeDrawer}
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <button
                type="button"
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700"
                onClick={addDraftMetric}
                disabled={draftMetrics.length >= 5}
              >
                Add metric
              </button>

              {draftMetrics.map((row, index) => {
                const flags = sourceFlags(row.sourceMode)
                return (
                  <div key={`metric-row-${index}`} className="rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Metric {index + 1}
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-600"
                        onClick={() => removeDraftMetric(index)}
                      >
                        Remove
                      </button>
                    </div>

                    <label className="block text-xs font-medium text-slate-700" htmlFor={`metric-${index}`}>
                      Metric
                    </label>
                    <select
                      id={`metric-${index}`}
                      aria-label="Metric"
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
                      value={row.metricKey}
                      onChange={(e) => updateDraftMetric(index, { metricKey: e.target.value })}
                    >
                      <option value="">Select metric</option>
                      {DASHBOARD_METRIC_GROUPS.map((group) => (
                        <optgroup
                          key={`${group.category}-${group.subcategory}`}
                          label={`${group.category} / ${group.subcategory}`}
                        >
                          {group.options.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    <div className="space-y-1">
                      <div className="text-xs font-medium text-slate-700">Range</div>
                      <div className="flex flex-wrap gap-1.5">
                        {RANGE_OPTIONS.map((rangeKey) => (
                          <button
                            key={`${index}-${rangeKey}`}
                            type="button"
                            onClick={() => updateDraftMetric(index, { rangeKey })}
                            className={`h-8 rounded-full border px-2.5 text-xs font-semibold ${
                              row.rangeKey === rangeKey
                                ? "border-sky-600 bg-sky-50 text-sky-700"
                                : "border-slate-300 text-slate-700"
                            }`}
                          >
                            {rangeKey}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-medium text-slate-700">Source</div>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={flags.game}
                            onChange={(e) => {
                              const nextMode = toSourceMode(e.target.checked, flags.practice)
                              if (!nextMode) return
                              updateDraftMetric(index, { sourceMode: nextMode })
                            }}
                          />
                          Game
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={flags.practice}
                            onChange={(e) => {
                              const nextMode = toSourceMode(flags.game, e.target.checked)
                              if (!nextMode) return
                              updateDraftMetric(index, { sourceMode: nextMode })
                            }}
                          />
                          Practice
                        </label>
                      </div>
                    </div>
                  </div>
                )
              })}

              {draftError && (
                <div className="text-xs text-red-600">{draftError}</div>
              )}
            </div>

            <div className="border-t border-slate-200 p-4 flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500">
                {savingDashboardMetrics ? "Saving changes..." : "Changes save automatically"}
              </div>
              <button
                type="button"
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700"
                onClick={closeCustomizeDrawer}
              >
                Close
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
