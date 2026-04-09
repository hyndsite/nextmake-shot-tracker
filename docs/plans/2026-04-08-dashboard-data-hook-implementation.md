# Dashboard Data Hook Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the data orchestration logic from `Dashboard` into a dedicated hook while preserving the current UI and behavior.

**Architecture:** Move athlete hydration, active-athlete state, snapshot loading, and dashboard metric loading into a `useDashboardData` hook. Keep `Dashboard.jsx` rendering structure stable so the refactor is bounded to separation-of-concerns rather than UI redesign. Validate with focused component tests before considering any presentation extraction.

**Tech Stack:** React, Vitest, Testing Library, local data modules, Supabase client wrappers

---

### Task 1: Add hook-level coverage through the Dashboard component

**Files:**
- Modify: `src/screens/__tests__/Dashboard.test.jsx`

**Step 1: Write the failing test**

Add or tighten tests that assert:
- athlete hydration still occurs on mount
- active-athlete state still drives the rendered profile
- configured metric cards still render from loaded dashboard metric config
- dashboard customization save flow still calls `replaceAthleteDashboardMetrics`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/__tests__/Dashboard.test.jsx`
Expected: FAIL once the test expectations are tightened for the new refactor boundary.

**Step 3: Keep only the minimal failing assertions**

Avoid broad snapshot-style assertions. Keep the tests targeted to the data-loading behaviors the hook will own.

**Step 4: Run test again to confirm a clean red state**

Run: `npm test -- src/screens/__tests__/Dashboard.test.jsx`
Expected: FAIL for the intended behavior gap only.

**Step 5: Commit**

```bash
git add src/screens/__tests__/Dashboard.test.jsx
git commit -m "test: cover dashboard data orchestration"
```

### Task 2: Extract dashboard data orchestration into a hook

**Files:**
- Create: `src/hooks/useDashboardData.js`
- Modify: `src/screens/Dashboard.jsx`

**Step 1: Implement the hook**

Move these concerns into `useDashboardData`:
- athlete list hydration
- active athlete lookup and switching state
- snapshot loading state and derived rows
- dashboard metric loading state
- error/loading state that belongs to data orchestration

**Step 2: Keep the screen thin**

Update `Dashboard.jsx` to consume the hook and focus on:
- rendering
- local UI-only concerns that are not part of shared data orchestration

**Step 3: Run focused tests**

Run: `npm test -- src/screens/__tests__/Dashboard.test.jsx`
Expected: PASS

**Step 4: Self-review for scope**

Confirm the refactor did not:
- change visible UI behavior
- introduce new copy or new flows
- move customization drawer logic into this task if it is not required for the data hook

**Step 5: Commit**

```bash
git add src/hooks/useDashboardData.js src/screens/Dashboard.jsx src/screens/__tests__/Dashboard.test.jsx
git commit -m "refactor: extract dashboard data hook"
```

### Task 3: Run focused verification

**Files:**
- Modify: none

**Step 1: Run Dashboard tests**

Run: `npm test -- src/screens/__tests__/Dashboard.test.jsx`
Expected: PASS

**Step 2: Run adjacent regression slice**

Run: `npm test -- src/components/__tests__/ActiveAthleteSwitcher.test.jsx src/screens/__tests__/Account.test.jsx`
Expected: PASS

**Step 3: Inspect changed files**

Run: `git diff --stat`
Expected: only the hook, `Dashboard.jsx`, and directly related tests are changed for this slice

**Step 4: Commit**

```bash
git add src/hooks/useDashboardData.js src/screens/Dashboard.jsx src/screens/__tests__/Dashboard.test.jsx
git commit -m "test: verify dashboard data hook refactor"
```
