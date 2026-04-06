# Dashboard Metrics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a per-athlete, Dashboard-only customization drawer that saves up to 5 metric line-chart configurations and renders configured charts on Dashboard.

**Architecture:** Extend existing dashboard metric persistence with source-mode support, then wire a Dashboard drawer editor + chart cards that read saved settings for the active athlete. Keep configuration state local to the drawer and commit atomically on save.

**Tech Stack:** React, Vitest + Testing Library, Supabase JS, Recharts.

---

### Task 1: Add source-mode support to DB schema and helper validation

**Files:**
- Modify: `supabase-athlete-dashboard-metrics.sql`
- Modify: `src/lib/athlete-dashboard-db.js`
- Modify: `src/lib/__tests__/athlete-dashboard-db.test.js`

**Step 1: Write the failing tests**
- Add helper tests that expect:
  - accepted `sourceMode`: `game`, `practice`, `both`
  - rejection for invalid source mode
  - persisted rows include `source_mode`

**Step 2: Run test to verify it fails**
- Run: `npm test -- src/lib/__tests__/athlete-dashboard-db.test.js`
- Expected: FAIL on missing source validation/field mapping.

**Step 3: Write minimal implementation**
- Add `source_mode text not null default 'both'` column + check constraint in SQL.
- In helper:
  - include `VALID_SOURCE_MODES`
  - sanitize/validate `sourceMode`
  - include `source_mode` in read select and insert payload

**Step 4: Run test to verify it passes**
- Run: `npm test -- src/lib/__tests__/athlete-dashboard-db.test.js`
- Expected: PASS.

**Step 5: Commit**
```bash
git add supabase-athlete-dashboard-metrics.sql src/lib/athlete-dashboard-db.js src/lib/__tests__/athlete-dashboard-db.test.js
git commit -m "feat: add source mode to athlete dashboard metrics"
```

### Task 2: Add metric catalog constants with grouped labels

**Files:**
- Create: `src/constants/dashboard-metrics.js`
- Create: `src/constants/__tests__/dashboard-metrics.test.js`

**Step 1: Write the failing tests**
- Validate catalog exports:
  - six metric keys
  - grouped structure (category + subcategory)
  - label lookup by key

**Step 2: Run test to verify it fails**
- Run: `npm test -- src/constants/__tests__/dashboard-metrics.test.js`
- Expected: FAIL file/module missing.

**Step 3: Write minimal implementation**
- Export grouped option model for UI dropdown.
- Export flat lookup maps used by Dashboard chart titles/formatters.

**Step 4: Run test to verify it passes**
- Run: `npm test -- src/constants/__tests__/dashboard-metrics.test.js`
- Expected: PASS.

**Step 5: Commit**
```bash
git add src/constants/dashboard-metrics.js src/constants/__tests__/dashboard-metrics.test.js
git commit -m "feat: add grouped dashboard metric catalog"
```

### Task 3: Add dashboard metric-series computation utilities

**Files:**
- Create: `src/lib/dashboard-metric-series.js`
- Create: `src/lib/__tests__/dashboard-metric-series.test.js`

**Step 1: Write the failing tests**
- Cover day bucket generation by range.
- Cover metric calculations from existing game/practice row shapes.
- Cover single-source and dual-source line series output.

**Step 2: Run test to verify it fails**
- Run: `npm test -- src/lib/__tests__/dashboard-metric-series.test.js`
- Expected: FAIL module missing.

**Step 3: Write minimal implementation**
- Build daily points for selected range.
- Compute values for 6 selected metrics.
- Return normalized chart data ready for Recharts.

**Step 4: Run test to verify it passes**
- Run: `npm test -- src/lib/__tests__/dashboard-metric-series.test.js`
- Expected: PASS.

**Step 5: Commit**
```bash
git add src/lib/dashboard-metric-series.js src/lib/__tests__/dashboard-metric-series.test.js
git commit -m "feat: add dashboard metric series builder"
```

### Task 4: Build Dashboard drawer editor + empty state + save flow

**Files:**
- Modify: `src/screens/Dashboard.jsx`
- Modify: `src/screens/__tests__/Dashboard.test.jsx`

**Step 1: Write the failing tests**
- Add tests for:
  - empty state placeholder `+ Metric (up to 5)`
  - opening/closing Customize drawer
  - dynamic row add/remove (max 5)
  - grouped metric picker rendering
  - source checkbox validation
  - save calls `replaceAthleteDashboardMetrics` with expected payload

**Step 2: Run test to verify it fails**
- Run: `npm test -- src/screens/__tests__/Dashboard.test.jsx`
- Expected: FAIL on missing UI and DB helper calls.

**Step 3: Write minimal implementation**
- Add `Customize Dashboard` button.
- Add slide-over drawer with dynamic rows.
- Wire load/save to `listAthleteDashboardMetrics` / `replaceAthleteDashboardMetrics`.
- Show empty-state placeholder when no saved metrics.

**Step 4: Run test to verify it passes**
- Run: `npm test -- src/screens/__tests__/Dashboard.test.jsx`
- Expected: PASS.

**Step 5: Commit**
```bash
git add src/screens/Dashboard.jsx src/screens/__tests__/Dashboard.test.jsx
git commit -m "feat: add dashboard customization drawer and empty state"
```

### Task 5: Render chart cards with Recharts for configured metrics

**Files:**
- Modify: `src/screens/Dashboard.jsx`
- Modify: `package.json`
- Modify: `src/screens/__tests__/Dashboard.test.jsx`

**Step 1: Write the failing tests**
- Add rendering tests:
  - configured metrics render cards with labels
  - dual-line compare label when `source_mode='both'`
  - no dashboard controls in chart cards

**Step 2: Run test to verify it fails**
- Run: `npm test -- src/screens/__tests__/Dashboard.test.jsx`
- Expected: FAIL on missing chart rendering.

**Step 3: Write minimal implementation**
- Add Recharts dependency.
- Render responsive line charts from computed series.

**Step 4: Run test to verify it passes**
- Run: `npm test -- src/screens/__tests__/Dashboard.test.jsx`
- Expected: PASS.

**Step 5: Commit**
```bash
git add package.json package-lock.json src/screens/Dashboard.jsx src/screens/__tests__/Dashboard.test.jsx
git commit -m "feat: render configurable dashboard line charts"
```

### Task 6: Full verification before completion

**Files:**
- Verify only

**Step 1: Run targeted tests**
- `npm test -- src/lib/__tests__/athlete-dashboard-db.test.js`
- `npm test -- src/constants/__tests__/dashboard-metrics.test.js`
- `npm test -- src/lib/__tests__/dashboard-metric-series.test.js`
- `npm test -- src/screens/__tests__/Dashboard.test.jsx`

**Step 2: Run broader confidence suite**
- `npm test -- src/screens/__tests__/Account.test.jsx`
- `npm test -- src/screens/__tests__/Dashboard.test.jsx src/lib/__tests__/athlete-dashboard-db.test.js`

**Step 3: Confirm SQL migration readiness**
- Ensure `supabase-athlete-dashboard-metrics.sql` is idempotent in policy section.

**Step 4: Commit verification artifacts if any (none expected)**
- No commit required unless files changed.
