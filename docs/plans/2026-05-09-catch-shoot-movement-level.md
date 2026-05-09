# Catch And Shoot Movement Level Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist `movement_level` metadata for catch-and-shoot shots in practice and game logging.

**Architecture:** Extend the existing shot-metadata pattern used for layup-only fields. Add a shared movement-level constant list, plumb the value through local DB writes and sync whitelists, then update both loggers to capture and edit the value only for catch-and-shoot shots.

**Tech Stack:** React, Vitest, Testing Library, IndexedDB wrappers, Supabase sync

---

### Task 1: Add failing persistence tests

**Files:**
- Modify: `src/lib/__tests__/practice-db.test.js`
- Modify: `src/lib/__tests__/game-db.test.js`
- Modify: `src/lib/__tests__/sync.test.js`

**Step 1: Write failing tests**
- Add tests that expect `movement_level` to be persisted on practice entries and game events.
- Add sync whitelist tests that expect `movement_level` to be included for `practice_entries` and `game_events`.

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/practice-db.test.js src/lib/__tests__/game-db.test.js src/lib/__tests__/sync.test.js`

**Step 3: Implement minimal persistence changes**
- Add `movement_level` handling to:
  - `src/lib/practice-db.js`
  - `src/lib/game-db.js`
  - `src/lib/sync.js`

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/practice-db.test.js src/lib/__tests__/game-db.test.js src/lib/__tests__/sync.test.js`

### Task 2: Add failing practice logger tests

**Files:**
- Modify: `src/screens/__tests__/PracticeLog.test.jsx`
- Modify: `src/constants/shotTypes.js`

**Step 1: Write failing tests**
- Assert movement-level control appears for catch-and-shoot and not for layups/other shot types.
- Assert default selection is `static`.
- Assert save payload includes `movementLevel` or `movement_level` appropriately.
- Assert edit flow restores and updates `movement_level`.

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/screens/__tests__/PracticeLog.test.jsx`

**Step 3: Implement minimal practice logger changes**
- Add shared movement-level options in `src/constants/shotTypes.js`.
- Update `src/screens/PracticeLog.jsx` state, conditional UI, create path, and edit path.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/screens/__tests__/PracticeLog.test.jsx`

### Task 3: Add failing game logger tests

**Files:**
- Modify: `src/screens/__tests__/GameLogger.test.jsx`

**Step 1: Write failing tests**
- Assert movement-level control appears only for catch-and-shoot shots in the modal.
- Assert default selection is `static`.
- Assert shot-save payload includes `movement_level`.
- Assert edit modal restores and re-saves `movement_level`.

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/screens/__tests__/GameLogger.test.jsx`

**Step 3: Implement minimal game logger changes**
- Update `src/screens/GameLogger.jsx` modal state, conditional UI, create path, and edit path.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/screens/__tests__/GameLogger.test.jsx`

### Task 4: Run focused verification

**Files:**
- Verify only

**Step 1: Run all touched focused suites**

Run: `npm test -- src/lib/__tests__/practice-db.test.js src/lib/__tests__/game-db.test.js src/lib/__tests__/sync.test.js src/screens/__tests__/PracticeLog.test.jsx src/screens/__tests__/GameLogger.test.jsx`

**Step 2: Confirm all pass**

Expected: PASS with no failing tests in the touched suites.

