# Dashboard Metrics Design (Per-Athlete, Configurable)

**Date:** 2026-02-24

## Scope
- Dashboard should be graph-first and configurable per athlete.
- Configuration UI exists only on `Dashboard`.
- Settings persist to Supabase per athlete (`athlete_dashboard_metrics`).

## UX Decisions (Approved)
- Add `Customize Dashboard` button in Dashboard athlete header.
- Open a right-side slide-over panel (drawer) for editing.
- Dashboard itself has no metric controls.
- If no configured metrics, show placeholder square card:
  - `+ Metric (up to 5)`
  - Tapping opens drawer.
- Metric rows are dynamic (`+ Add metric`), max 5.

## Row Configuration
Each metric row includes:
- `Enabled` toggle
- Metric picker (grouped by category/subcategory)
- Time range segmented control: `7d | 30d | 90d | 180d | 1y`
- Source checkboxes: `Game`, `Practice`

Rules:
- At least one source must be selected.
- If both are selected, Dashboard chart shows two lines (Game vs Practice).

## V1 Metric Catalog (2 per category)
- Efficiency / Core Shooting
  - `eFG% (overall)`
  - `FG% (overall)`
- Volume / Shot Volume
  - `Total Attempts`
  - `Total Makes`
- Shot Profile Composition / Shot Selection Distribution
  - `% of Total Shots from 3`
  - `% at Rim`

## Data Model & Persistence
- Use existing table: `public.athlete_dashboard_metrics`
- Existing columns cover:
  - `metric_key`, `range_key`, `position`, `enabled`
- Add source selection persistence with `source_mode`:
  - `game` | `practice` | `both`

## Dashboard Rendering
- On active-athlete load/switch:
  - Read saved config for athlete.
  - Render up to 5 chart cards in saved order.
- Per chart card:
  - Header: metric label + selected range
  - X-axis: day buckets
  - Y-axis: metric value
  - One line if single source; two lines for `both`.

## Error Handling
- Load/save errors shown inline in dashboard section/drawer.
- Save failure keeps draft open and does not discard changes.
- Ownership constraints enforced by frontend checks + RLS.

## Library Choice
- Use `recharts` for chart rendering in V1.
