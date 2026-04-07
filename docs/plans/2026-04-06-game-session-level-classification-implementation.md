# Game Session Level Classification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add structured game-session classification for `K-12`, `College`, `AAU / Travel`, and `Other` while preserving the existing `level` display string throughout the app.

**Architecture:** Introduce structured classification fields in `game_sessions`, centralize option lists and derived-label formatting in the frontend, and update the New Game flow to save both structured values and the existing display label. Keep legacy screens rendering from `level` so existing data remains valid without backfill.

**Tech Stack:** React, Vite, local IndexedDB helpers, Supabase SQL migration scripts, Vitest, Testing Library

---

### Task 1: Add classification constants and formatter coverage

**Files:**
- Modify: `src/constants/programLevel.js`
- Create: `src/constants/__tests__/programLevel.test.js`

**Step 1: Write the failing test**

Add tests for:
- category option labels and stored values
- K-12 grade options
- AAU season options
- college season option generation for a fixed date
- derived `level` label formatting for each category

**Step 2: Run test to verify it fails**

Run: `npm test -- src/constants/__tests__/programLevel.test.js`
Expected: FAIL because the new exports/helpers do not exist yet.

**Step 3: Write minimal implementation**

Update `src/constants/programLevel.js` to export:
- category options
- K-12 grade options
- AAU season options
- a helper for rolling college academic seasons
- a helper that builds the display `level` string from structured values

**Step 4: Run test to verify it passes**

Run: `npm test -- src/constants/__tests__/programLevel.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/constants/programLevel.js src/constants/__tests__/programLevel.test.js
git commit -m "feat: add game level classification constants"
```

### Task 2: Add local game-session support for structured classification

**Files:**
- Modify: `src/lib/game-db.js`
- Modify: `src/lib/__tests__/game-db.test.js`

**Step 1: Write the failing test**

Add tests asserting that `addGameSession`:
- accepts `level_category`, `level_grade`, `college_season`, and `aau_season`
- derives and stores the display `level`
- clears or ignores unrelated detail fields
- preserves legacy behavior when only `level` is provided

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/game-db.test.js`
Expected: FAIL because the new fields are not persisted or derived.

**Step 3: Write minimal implementation**

Update `addGameSession` so it:
- stores the new structured fields on the local row
- uses the shared formatter to populate `level`
- preserves existing defaults for legacy callers

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/game-db.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/game-db.js src/lib/__tests__/game-db.test.js
git commit -m "feat: persist structured game level metadata"
```

### Task 3: Update the New Game form for conditional classification inputs

**Files:**
- Modify: `src/screens/GameNew.jsx`
- Modify: `src/screens/__tests__/GameNew.test.jsx`

**Step 1: Write the failing test**

Add tests for:
- default category/detail selection
- conditional second dropdown for `K-12`, `College`, and `AAU / Travel`
- clearing stale detail values when the category changes
- submission payload including structured fields and derived `level`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/__tests__/GameNew.test.jsx`
Expected: FAIL because the form still uses the old single-level dropdown.

**Step 3: Write minimal implementation**

Update `GameNew` to:
- use `level_category` state plus category-specific detail state
- render the second dropdown conditionally
- build the save payload with structured fields
- rely on the shared formatter for the display `level`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/screens/__tests__/GameNew.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/screens/GameNew.jsx src/screens/__tests__/GameNew.test.jsx
git commit -m "feat: add conditional game level inputs"
```

### Task 4: Verify downstream display compatibility

**Files:**
- Modify: `src/screens/__tests__/GameLogger.test.jsx`
- Modify: `src/screens/__tests__/GameDetail.test.jsx`

**Step 1: Write the failing test**

Adjust or add tests to confirm game logger/detail screens still display the saved `level` label for newly created structured rows.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/__tests__/GameLogger.test.jsx src/screens/__tests__/GameDetail.test.jsx`
Expected: FAIL only if assumptions about displayed labels changed.

**Step 3: Write minimal implementation**

Only update app code if any downstream screen depends on old hard-coded assumptions about level values.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/screens/__tests__/GameLogger.test.jsx src/screens/__tests__/GameDetail.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/screens/__tests__/GameLogger.test.jsx src/screens/__tests__/GameDetail.test.jsx src/screens/GameLogger.jsx src/screens/GameDetail.jsx
git commit -m "test: cover structured game level labels"
```

### Task 5: Add Supabase migration for structured classification fields

**Files:**
- Create: `docs/SQL/supabase-game-session-level-classification.sql`

**Step 1: Write the migration**

Create a migration that:
- adds `level_category`, `level_grade`, `college_season`, and `aau_season`
- adds check constraints for valid category values
- adds combination checks so only valid detail fields are populated for each category

**Step 2: Review the migration**

Review for:
- nullable compatibility with existing rows
- non-breaking behavior for legacy data
- explicit constraint names

**Step 3: Save the final SQL**

Keep the migration additive only. Do not rewrite or backfill legacy rows in this file.

**Step 4: Commit**

```bash
git add docs/SQL/supabase-game-session-level-classification.sql
git commit -m "feat: add game session level classification columns"
```

### Task 6: Run focused verification

**Files:**
- Modify: none

**Step 1: Run focused tests**

Run:
- `npm test -- src/constants/__tests__/programLevel.test.js`
- `npm test -- src/lib/__tests__/game-db.test.js`
- `npm test -- src/screens/__tests__/GameNew.test.jsx`
- `npm test -- src/screens/__tests__/GameLogger.test.jsx src/screens/__tests__/GameDetail.test.jsx`

Expected: PASS

**Step 2: Run a broader regression slice**

Run: `npm test -- src/screens/__tests__/GameGate.test.jsx src/screens/__tests__/ModeGate.test.jsx`
Expected: PASS

**Step 3: Inspect changed files**

Run: `git diff --stat`
Expected: only the intended constants, game-session logic, tests, docs, and migration files are changed

**Step 4: Commit**

```bash
git add src/constants/programLevel.js src/constants/__tests__/programLevel.test.js src/lib/game-db.js src/lib/__tests__/game-db.test.js src/screens/GameNew.jsx src/screens/__tests__/GameNew.test.jsx src/screens/__tests__/GameLogger.test.jsx src/screens/__tests__/GameDetail.test.jsx docs/SQL/supabase-game-session-level-classification.sql
git commit -m "feat: support structured game session level classification"
```
