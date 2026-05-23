# Off-Dribble Movement Level Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend persisted `movement_level` metadata to off-dribble shots using the values `controlled`, `lateral`, and `downhill`.

**Architecture:** Reuse the existing `movement_level` field that already supports catch-and-shoot metadata, but make the defaults, allowed values, and UI option lists depend on `shot_type`. Update the shared constants, local persistence, sync whitelist behavior, and both logging UIs, then add a SQL migration/backfill so legacy off-dribble rows normalize to `controlled`.

**Tech Stack:** React, Vitest, Testing Library, IndexedDB wrappers, Supabase sync, SQL migration scripts

---

### Task 1: Add failing persistence and normalization tests

**Files:**
- Modify: `src/lib/__tests__/practice-db.test.js`
- Modify: `src/lib/__tests__/game-db.test.js`
- Modify: `src/lib/__tests__/sync.test.js`

**Step 1: Write the failing tests**
- Add tests that expect off-dribble practice entries to persist `movement_level` values such as `controlled`.
- Add tests that expect off-dribble game events to persist `movement_level` values such as `lateral`.
- Add tests that expect legacy off-dribble rows with `null` `movement_level` to normalize to `controlled`.
- Add sync whitelist tests that expect `movement_level` to be included for off-dribble `practice_entries` and `game_events`.

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/practice-db.test.js src/lib/__tests__/game-db.test.js src/lib/__tests__/sync.test.js`

Expected: FAIL with missing off-dribble movement persistence or normalization behavior.

**Step 3: Write minimal implementation**
- Update `src/lib/practice-db.js` so off-dribble entries preserve and default `movement_level`.
- Update `src/lib/game-db.js` so off-dribble events preserve and default `movement_level`.
- Update `src/lib/sync.js` only if the current whitelist or row cleanup path drops the new values.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/practice-db.test.js src/lib/__tests__/game-db.test.js src/lib/__tests__/sync.test.js`

Expected: PASS for the touched persistence and sync suites.

### Task 2: Add failing shared option and practice logger tests

**Files:**
- Modify: `src/constants/shotTypes.js`
- Modify: `src/screens/__tests__/PracticeLog.test.jsx`

**Step 1: Write the failing tests**
- Assert off-dribble shows a Movement Level control in the practice logger.
- Assert the off-dribble options are `Controlled`, `Lateral`, and `Downhill`.
- Assert the default off-dribble selection is `controlled`.
- Assert switching between catch-and-shoot and off-dribble resets the selection to the correct default.
- Assert save and edit flows preserve off-dribble `movement_level`.

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/screens/__tests__/PracticeLog.test.jsx`

Expected: FAIL because the current UI only supports catch-and-shoot movement metadata.

**Step 3: Write minimal implementation**
- Update `src/constants/shotTypes.js` to expose shot-type-aware movement-level options and defaults.
- Update `src/screens/PracticeLog.jsx` to:
  - render the control for both `catch_shoot` and `off_dribble`
  - use the correct option list for the active shot type
  - default off-dribble to `controlled`
  - restore saved off-dribble values in edit mode

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/screens/__tests__/PracticeLog.test.jsx`

Expected: PASS for the practice logger suite.

### Task 3: Add failing game logger tests

**Files:**
- Modify: `src/screens/__tests__/GameLogger.test.jsx`

**Step 1: Write the failing tests**
- Assert off-dribble shows a Movement Level control in the game logger modal.
- Assert the off-dribble options are `Controlled`, `Lateral`, and `Downhill`.
- Assert the default off-dribble selection is `controlled`.
- Assert switching shot types resets movement level to the correct default.
- Assert create and edit flows save and restore off-dribble `movement_level`.

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/screens/__tests__/GameLogger.test.jsx`

Expected: FAIL because the current modal only treats catch-and-shoot as movement-level-aware.

**Step 3: Write minimal implementation**
- Update `src/screens/GameLogger.jsx` to:
  - render the control for both supported shot types
  - source the correct option list from shared constants
  - default off-dribble to `controlled`
  - preload and update off-dribble values during edits

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/screens/__tests__/GameLogger.test.jsx`

Expected: PASS for the game logger suite.

### Task 4: Add SQL migration and backfill plan

**Files:**
- Modify: `docs/SQL/supabase-shot-movement-level.sql`
- Modify: `docs/SQL/supabase-shot-movement-level-backfill-static.sql`

**Step 1: Write the failing migration expectations**
- Update the SQL documentation notes to require both catch-and-shoot and off-dribble values.
- Define the expected backfill behavior for legacy off-dribble rows with `NULL` `movement_level`.

**Step 2: Review the SQL constraints before editing**

Run: `sed -n '1,220p' docs/SQL/supabase-shot-movement-level.sql && sed -n '1,200p' docs/SQL/supabase-shot-movement-level-backfill-static.sql`

Expected: existing check constraint only allows catch-and-shoot values and existing backfill only covers catch-and-shoot rows.

**Step 3: Write minimal SQL changes**
- Expand the `movement_level` check constraints to allow:
  - `static`
  - `relocation`
  - `on_the_move`
  - `controlled`
  - `lateral`
  - `downhill`
- Extend the backfill script so `off_dribble` rows with `NULL` `movement_level` are updated to `controlled`.
- Update the SQL notes to describe both supported shot types.

**Step 4: Re-read the SQL files to verify the final state**

Run: `sed -n '1,240p' docs/SQL/supabase-shot-movement-level.sql && sed -n '1,220p' docs/SQL/supabase-shot-movement-level-backfill-static.sql`

Expected: the files clearly allow both value sets and document the new default.

### Task 5: Run focused verification

**Files:**
- Verify only

**Step 1: Run all touched focused suites**

Run: `npm test -- src/lib/__tests__/practice-db.test.js src/lib/__tests__/game-db.test.js src/lib/__tests__/sync.test.js src/screens/__tests__/PracticeLog.test.jsx src/screens/__tests__/GameLogger.test.jsx`

Expected: PASS with no failing tests in the touched suites.

**Step 2: Review changed docs and SQL**

Run: `git diff -- docs/plans/2026-05-22-off-dribble-movement-level-design.md docs/plans/2026-05-22-off-dribble-movement-level.md docs/SQL/supabase-shot-movement-level.sql docs/SQL/supabase-shot-movement-level-backfill-static.sql`

Expected: diff matches the approved behavior and migration notes.
