# GoalsManager Hook Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split `useGoalsManagerData` into smaller internal hooks while preserving its current public API for `GoalsManager`.

**Architecture:** Keep `useGoalsManagerData` as the screen-facing orchestration hook, but move its responsibilities into focused internal hooks for query/loading, goal set form state, goal form state, and expansion/UI state. The screen and extracted components should not need interface changes from this pass.

**Tech Stack:** React, Vitest, Testing Library, Vite

---

### Task 1: Strengthen hook-level regression coverage

**Files:**
- Modify: `src/hooks/__tests__/useGoalsManagerData.test.jsx`

**Step 1: Write the failing test**

Add focused tests for:
- default selected active set behavior
- `selectAthlete` updating athlete state
- `toggleExpanded` mutating expanded ids
- `startEditSet` hydrating the set form and opening the accordion
- goal metric correction when selected set changes from game to practice

**Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/__tests__/useGoalsManagerData.test.jsx`
Expected: FAIL because the new behaviors are not fully asserted or supported under refactor pressure yet

**Step 3: Write minimal implementation**

Keep the current hook behavior intact while preparing for extraction.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/__tests__/useGoalsManagerData.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/__tests__/useGoalsManagerData.test.jsx
git commit -m "test: expand goals manager hook coverage"
```

### Task 2: Extract internal query and derived-state hooks

**Files:**
- Create: `src/hooks/goals-manager/useGoalsManagerQuery.js`
- Create: `src/hooks/goals-manager/useGoalsManagerDerivedState.js`
- Modify: `src/hooks/useGoalsManagerData.js`
- Test: `src/hooks/__tests__/useGoalsManagerData.test.jsx`

**Step 1: Write the failing test**

Use the expanded hook tests from Task 1 as the regression harness.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/__tests__/useGoalsManagerData.test.jsx`
Expected: FAIL after the first extraction attempt if interfaces drift or hydration/selection behavior changes

**Step 3: Write minimal implementation**

Extract:
- remote and athlete hydration logic into `useGoalsManagerQuery`
- sorted lists, selected set lookup, and metric-option derivation into `useGoalsManagerDerivedState`

Keep `useGoalsManagerData` responsible for composition only.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/__tests__/useGoalsManagerData.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useGoalsManagerData.js src/hooks/goals-manager/useGoalsManagerQuery.js src/hooks/goals-manager/useGoalsManagerDerivedState.js src/hooks/__tests__/useGoalsManagerData.test.jsx
git commit -m "refactor: extract goals manager query state"
```

### Task 3: Extract internal form and UI-state hooks

**Files:**
- Create: `src/hooks/goals-manager/useGoalSetForm.js`
- Create: `src/hooks/goals-manager/useGoalForm.js`
- Create: `src/hooks/goals-manager/useGoalSetExpansion.js`
- Modify: `src/hooks/useGoalsManagerData.js`
- Test: `src/hooks/__tests__/useGoalsManagerData.test.jsx`

**Step 1: Write the failing test**

Rely on the existing hook-level regression tests that cover editing, metric resets, and expansion behavior.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/__tests__/useGoalsManagerData.test.jsx`
Expected: FAIL if form state or handler wiring changes during extraction

**Step 3: Write minimal implementation**

Extract:
- set form state and reset helpers into `useGoalSetForm`
- goal form state and reset helpers into `useGoalForm`
- expanded ids and accordion open-state into `useGoalSetExpansion`

Wire the mutation handlers in `useGoalsManagerData` against these smaller hooks.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/__tests__/useGoalsManagerData.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useGoalsManagerData.js src/hooks/goals-manager/useGoalSetForm.js src/hooks/goals-manager/useGoalForm.js src/hooks/goals-manager/useGoalSetExpansion.js src/hooks/__tests__/useGoalsManagerData.test.jsx
git commit -m "refactor: split goals manager form and ui state"
```

### Task 4: Final verification

**Files:**
- Verify only

**Step 1: Run focused tests**

Run: `npm test -- src/hooks/__tests__/useGoalsManagerData.test.jsx src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx`
Expected: PASS

**Step 2: Run broader related suite**

Run: `npm test -- src/lib/__tests__/goal-metrics.test.js src/lib/__tests__/goals-ui.test.js src/lib/__tests__/goals-db.test.js src/components/goals/__tests__/GoalSetCard.test.jsx`
Expected: PASS

**Step 3: Review diff**

Run: `git diff -- src/hooks/useGoalsManagerData.js src/hooks/goals-manager src/hooks/__tests__/useGoalsManagerData.test.jsx`
Expected: only intended hook-splitting changes

**Step 4: Commit**

```bash
git add src/hooks/useGoalsManagerData.js src/hooks/goals-manager src/hooks/__tests__/useGoalsManagerData.test.jsx
git commit -m "refactor: split goals manager data hook"
```
