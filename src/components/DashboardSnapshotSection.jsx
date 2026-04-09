import { fmtPct, pct, zoneLabel } from "../lib/dashboard-formatters"

export default function DashboardSnapshotSection({ snapshot, loading }) {
  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Performance Snapshot</h3>
        {loading && <span className="text-xs text-slate-500">Updating...</span>}
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
  )
}
