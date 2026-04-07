# Dashboard Metrics Handoff

Last updated: 2026-03-07

## Product/UI decisions currently implemented
- Dashboard configuration entry point is the Dashboard Metrics card.
- `+ Add Metric` button:
  - square button (`w-1/2`, `aspect-square`)
  - appears at the bottom of the Dashboard Metrics card
  - hidden when 5 metrics are configured
  - opens right slide-over drawer
- Dashboard Metrics subtitle under title:
  - `Add up to N metrics` (remaining slots)
  - `Max number metrics reached` at 5 configured metrics
- No `Customize Dashboard` buttons in header/active-athlete area.
- Removed helper text card: `Use the bottom navigation to jump to Practice or Game...`

## Drawer behavior (current)
- Autosave mode is enabled.
- Metric add/remove/change (metric key, range, source) saves immediately.
- Save button removed from drawer.
- Footer shows save state:
  - `Saving changes...`
  - `Changes save automatically`
- `Close` dismisses drawer (no separate local draft-only state).

## Metric card behavior
- Each configured metric card has `Remove` action in card header.
- Remove persists immediately via `replaceAthleteDashboardMetrics`.

## Data model expectations
Table: `public.athlete_dashboard_metrics`
- `metric_key`
- `range_key` in `7d|30d|90d|180d|1y`
- `source_mode` in `game|practice|both`
- `position` 0..4
- `enabled`

## Required DB migration
Run SQL file:
- `docs/SQL/supabase-athlete-dashboard-metrics.sql`

Minimum critical migration (if only patching):
- add `source_mode` column
- add `source_mode` check constraint

## Tests currently passing
- `npm test -- src/screens/__tests__/Dashboard.test.jsx` (11/11)
- `npm test -- src/lib/__tests__/athlete-dashboard-db.test.js` (8/8)

## Notes for next session
- If you want strict schema mode (no compatibility fallback), remove legacy read fallback in `src/lib/athlete-dashboard-db.js` after confirming all environments are migrated.
- Optional future polish:
  - chart visual tuning / legends
  - richer no-data rendering per chart card
