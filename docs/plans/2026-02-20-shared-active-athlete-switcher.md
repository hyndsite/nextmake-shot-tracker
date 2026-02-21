# Shared Active Athlete Switcher Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract duplicated active-athlete card/switch UI into a shared component and reuse it in Goals and Performance without changing behavior.

**Architecture:** Add a reusable `ActiveAthleteSwitcher` component in `src/components`, then replace local helper components/UI in `GoalsManager` and `Performance` with this shared component. Keep parent state ownership in each screen so loading behavior remains unchanged.

**Tech Stack:** React, Vitest, Testing Library

---

### Task 1: Add failing component tests

**Files:**
- Create: `src/components/__tests__/ActiveAthleteSwitcher.test.jsx`

**Step 1: Write failing tests**
- Renders active athlete title/name.
- Toggles switch list.
- Calls `onSelectAthlete` and closes list after selection.
- Shows empty state text when no athletes.

**Step 2: Run test to verify fail**
- `npm test -- src/components/__tests__/ActiveAthleteSwitcher.test.jsx`

### Task 2: Implement shared component

**Files:**
- Create: `src/components/ActiveAthleteSwitcher.jsx`

**Step 1: Minimal implementation**
- Implement reusable athlete card + switch list UI.
- Preserve labels/aria semantics used by current tests (`Active athlete`, `Switch athlete`, `Athlete list`).

**Step 2: Run component tests**
- `npm test -- src/components/__tests__/ActiveAthleteSwitcher.test.jsx`

### Task 3: Migrate GoalsManager and Performance to shared component

**Files:**
- Modify: `src/screens/GoalsManager.jsx`
- Modify: `src/screens/Performance.jsx`

**Step 1: Replace duplicated helper components/markup**
- Use `<ActiveAthleteSwitcher ... />` in both screens.
- Keep parent callbacks (`setActiveAthlete`, local state update) unchanged.

**Step 2: Verify screen tests**
- `npm test -- src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx src/screens/__tests__/Performance.test.jsx`

### Task 4: Final verification

**Files:**
- No additional changes expected

**Step 1: Run focused test set**
- `npm test -- src/components/__tests__/ActiveAthleteSwitcher.test.jsx src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx src/screens/__tests__/Performance.test.jsx`
