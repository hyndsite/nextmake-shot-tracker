# GoalsManager Grouped Return Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat `useGoalsManagerData` return surface with grouped objects while preserving `GoalsManager` behavior.

**Architecture:** Keep the existing internal hook split, but reshape the public return contract into responsibility-based groups such as `athlete`, `setForm`, `goalForm`, `lists`, `ui`, and `actions`. Update `GoalsManager.jsx` to consume those groups directly without changing user-visible behavior.

**Tech Stack:** React, Vitest, Testing Library, Vite

---

### Task 1: Define the grouped hook contract with failing tests

**Files:**
- Modify: `src/hooks/__tests__/useGoalsManagerData.test.jsx`

**Step 1: Write the failing test**

Add assertions that `useGoalsManagerData()` returns grouped objects:
- `athlete`
- `setForm`
- `goalForm`
- `lists`
- `ui`
- `actions`

Verify a few representative values and handlers live in the expected groups.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/__tests__/useGoalsManagerData.test.jsx`
Expected: FAIL because the hook still returns a flat object

**Step 3: Write minimal implementation**

Reshape the hook return contract to grouped objects without changing underlying behavior.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/__tests__/useGoalsManagerData.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/__tests__/useGoalsManagerData.test.jsx src/hooks/useGoalsManagerData.js
git commit -m "refactor: group goals manager hook return contract"
```

### Task 2: Update GoalsManager to consume grouped contract

**Files:**
- Modify: `src/screens/GoalsManager.jsx`
- Test: `src/screens/__tests__/GoalsManager.test.jsx`
- Test: `src/screens/__tests__/GoalsManagerProgress.test.jsx`

**Step 1: Write the failing test**

Use the existing screen tests as the regression harness.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx`
Expected: FAIL after the hook return shape changes and before the screen is updated

**Step 3: Write minimal implementation**

Update `GoalsManager.jsx` to read from:
- `athlete`
- `setForm`
- `goalForm`
- `lists`
- `ui`
- `actions`

Leave child component prop contracts unchanged for this pass.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/screens/GoalsManager.jsx src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx
git commit -m "refactor: consume grouped goals manager hook api"
```

### Task 3: Final verification

**Files:**
- Verify only

**Step 1: Run focused tests**

Run: `npm test -- src/hooks/__tests__/useGoalsManagerData.test.jsx src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx`
Expected: PASS

**Step 2: Run broader related suite**

Run: `npm test -- src/lib/__tests__/goal-metrics.test.js src/lib/__tests__/goals-ui.test.js src/lib/__tests__/goals-db.test.js src/components/goals/__tests__/GoalSetCard.test.jsx`
Expected: PASS

**Step 3: Review diff**

Run: `git diff -- src/hooks/useGoalsManagerData.js src/screens/GoalsManager.jsx src/hooks/__tests__/useGoalsManagerData.test.jsx`
Expected: only grouped return and consumer updates

**Step 4: Commit**

```bash
git add src/hooks/useGoalsManagerData.js src/screens/GoalsManager.jsx src/hooks/__tests__/useGoalsManagerData.test.jsx
git commit -m "refactor: group goals manager hook surface"
```
