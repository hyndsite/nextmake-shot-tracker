# GoalsManager Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `GoalsManager` into smaller UI components and shared goal utilities without changing user-visible behavior.

**Architecture:** Keep `useGoalsManagerData` as the state and mutation boundary for this pass, but move view-model logic and repeated JSX out of the screen. The screen should become a thin composition layer over extracted goal-specific components and shared progress/date helpers.

**Tech Stack:** React, Vitest, Testing Library, Vite

---

### Task 1: Add shared goals utility coverage

**Files:**
- Create: `src/lib/__tests__/goals-ui.test.js`
- Create: `src/lib/goals-ui.js`
- Modify: `src/screens/__tests__/GoalsManagerProgress.test.jsx`

**Step 1: Write the failing test**

Add tests for:
- `formatDueDate` formatting an ISO date
- `daysLeft` returning a normalized day difference
- `computeGoalProgress` using game metrics for game sets
- `computeGoalProgress` using practice metrics for practice sets

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/goals-ui.test.js`
Expected: FAIL because `src/lib/goals-ui.js` does not exist yet

**Step 3: Write minimal implementation**

Implement `src/lib/goals-ui.js` with:
- `formatDueDate`
- `daysLeft`
- `computeGoalProgress`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/goals-ui.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/goals-ui.js src/lib/__tests__/goals-ui.test.js src/screens/__tests__/GoalsManagerProgress.test.jsx
git commit -m "refactor: extract goals ui helpers"
```

### Task 2: Add component-level screen regression coverage

**Files:**
- Modify: `src/screens/__tests__/GoalsManager.test.jsx`
- Create: `src/components/goals/GoalCard.jsx`
- Create: `src/components/goals/GoalSetCard.jsx`
- Create: `src/components/goals/GoalSetFormSection.jsx`
- Create: `src/components/goals/AddGoalFormSection.jsx`

**Step 1: Write the failing test**

Add or adjust screen tests to protect:
- rendering active and archived sets through the same card behavior
- rendering goal progress once a set is expanded
- preserving the create-set and add-goal accordion form behavior

**Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx`
Expected: FAIL after test expectations are updated for the extracted structure

**Step 3: Write minimal implementation**

Create the extracted components and wire the existing screen behavior through them without changing user-facing copy or handlers.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/screens/GoalsManager.jsx src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx src/components/goals/GoalCard.jsx src/components/goals/GoalSetCard.jsx src/components/goals/GoalSetFormSection.jsx src/components/goals/AddGoalFormSection.jsx
git commit -m "refactor: split goals manager screen components"
```

### Task 3: Move shared labels/constants out of the data hook

**Files:**
- Modify: `src/hooks/useGoalsManagerData.js`
- Modify: `src/lib/goal-metrics.js`
- Modify: `src/screens/GoalsManager.jsx`
- Modify: `src/components/goals/GoalCard.jsx`
- Modify: `src/components/goals/AddGoalFormSection.jsx`
- Modify: `src/hooks/__tests__/useGoalsManagerData.test.jsx`

**Step 1: Write the failing test**

Update tests to assert the hook no longer needs to be the owner of `metricLabel`, `zoneLabel`, and `ZONE_METRICS`, while existing screen behavior stays intact.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/__tests__/useGoalsManagerData.test.jsx src/screens/__tests__/GoalsManager.test.jsx`
Expected: FAIL because imports and mocks still assume those exports come from the hook

**Step 3: Write minimal implementation**

Move:
- `ZONE_METRICS`
- `metricLabel`
- `zoneLabel`

into `src/lib/goal-metrics.js`, then update imports accordingly.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/__tests__/useGoalsManagerData.test.jsx src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx src/lib/__tests__/goals-ui.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useGoalsManagerData.js src/lib/goal-metrics.js src/screens/GoalsManager.jsx src/components/goals/GoalCard.jsx src/components/goals/AddGoalFormSection.jsx src/hooks/__tests__/useGoalsManagerData.test.jsx src/screens/__tests__/GoalsManager.test.jsx
git commit -m "refactor: move goals labels and constants out of hook"
```

### Task 4: Final verification

**Files:**
- Verify only

**Step 1: Run focused tests**

Run: `npm test -- src/lib/__tests__/goals-ui.test.js src/hooks/__tests__/useGoalsManagerData.test.jsx src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx`
Expected: PASS

**Step 2: Run broader related suite**

Run: `npm test -- src/lib/__tests__/goal-metrics.test.js src/lib/__tests__/goals-db.test.js`
Expected: PASS

**Step 3: Review diff**

Run: `git diff -- src/screens/GoalsManager.jsx src/hooks/useGoalsManagerData.js src/lib/goal-metrics.js src/lib/goals-ui.js src/components/goals`
Expected: only intended cleanup changes

**Step 4: Commit**

```bash
git add src/screens/GoalsManager.jsx src/hooks/useGoalsManagerData.js src/lib/goal-metrics.js src/lib/goals-ui.js src/lib/__tests__/goals-ui.test.js src/components/goals src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx src/hooks/__tests__/useGoalsManagerData.test.jsx
git commit -m "refactor: clean up goals manager screen"
```
