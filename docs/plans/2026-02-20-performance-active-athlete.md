# Performance Active Athlete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add active-athlete switching and filtering to the Performance screen so game/practice metrics only show the selected athlete and no data is shown when no active athlete exists.

**Architecture:** Mirror the athlete UX pattern used in GoalsManager for the Performance header area and pass `athleteId` from screen state into performance data loaders. Extend `performance-db` loaders to filter sessions/events/entries by `athlete_id` when provided, while preserving existing behavior when no athlete option is passed.

**Tech Stack:** React, Vitest, Testing Library, idb-keyval data access

---

### Task 1: Add failing screen tests for active athlete behavior

**Files:**
- Modify: `src/screens/__tests__/Performance.test.jsx`

**Step 1: Write the failing test**
- Add test asserting Performance passes `athleteId` from active athlete storage to `getGamePerformance` and `getPracticePerformance`.
- Add test asserting no active athlete shows prompt and avoids calling performance loaders.

**Step 2: Run test to verify it fails**
- Run: `npm test -- src/screens/__tests__/Performance.test.jsx`
- Expected: FAIL because component does not yet include athlete context/prompt behavior.

**Step 3: Write minimal implementation**
- Defer to Task 3.

**Step 4: Run test to verify it passes**
- After Task 3 implementation, rerun the same command.

### Task 2: Add failing data-layer tests for athlete filtering

**Files:**
- Modify: `src/lib/__tests__/performance-db.test.js`

**Step 1: Write the failing test**
- Add game performance test proving only matching `athlete_id` rows count when `athleteId` is provided.
- Add practice performance test proving only matching `athlete_id` rows count when `athleteId` is provided.

**Step 2: Run test to verify it fails**
- Run: `npm test -- src/lib/__tests__/performance-db.test.js`
- Expected: FAIL because loaders do not currently filter by `athleteId`.

**Step 3: Write minimal implementation**
- Defer to Task 3.

**Step 4: Run test to verify it passes**
- After Task 3 implementation, rerun the same command.

### Task 3: Implement active athlete in Performance and performance-db

**Files:**
- Modify: `src/screens/Performance.jsx`
- Modify: `src/lib/performance-db.js`

**Step 1: Implement screen state + UI**
- Add athlete imports from `athlete-db` and switch icon.
- Add athlete helper components (avatar/row) and state (`athletes`, `activeAthleteId`, `showSwitchAthlete`).
- Render active-athlete card and switch list in Performance main section.
- Add no-active-athlete prompt state.

**Step 2: Implement loader wiring**
- Pass `athleteId` to both performance loader calls.
- Guard load effects so no active athlete means empty state without data fetch.

**Step 3: Implement data-layer filtering**
- Extend `getGamePerformance` and `getPracticePerformance` options with `athleteId`.
- Filter sessions and events/entries to matching athlete when option provided.

**Step 4: Verify tests**
- Run:
  - `npm test -- src/screens/__tests__/Performance.test.jsx`
  - `npm test -- src/lib/__tests__/performance-db.test.js`

### Task 4: Final verification

**Files:**
- No code changes expected

**Step 1: Run full relevant verification**
- Run: `npm test -- src/screens/__tests__/Performance.test.jsx src/lib/__tests__/performance-db.test.js`
- Expected: PASS.

**Step 2: Review diff quality**
- Run: `git diff -- src/screens/Performance.jsx src/lib/performance-db.js src/screens/__tests__/Performance.test.jsx src/lib/__tests__/performance-db.test.js`

