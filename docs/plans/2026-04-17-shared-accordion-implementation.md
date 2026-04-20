# Shared Accordion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce a reusable controlled accordion wrapper and adopt it in `GoalsManager` first.

**Architecture:** Create a shared `AccordionSection` UI component that owns the repeated header shell, chevron behavior, and content wrapper while leaving open-state controlled by the consuming screen or component. Refactor `GoalsManager` and its goal form sections to use the wrapper without changing visible behavior.

**Tech Stack:** React, Vitest, Testing Library, Vite

---

### Task 1: Define AccordionSection with failing tests

**Files:**
- Create: `src/components/ui/AccordionSection.jsx`
- Create: `src/components/ui/__tests__/AccordionSection.test.jsx`

**Step 1: Write the failing test**

Add tests for:
- rendering title text
- calling `onToggle` when the header is clicked
- rotating the chevron when open
- rendering children only when open
- supporting content class overrides

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ui/__tests__/AccordionSection.test.jsx`
Expected: FAIL because `AccordionSection.jsx` does not exist yet

**Step 3: Write minimal implementation**

Implement a controlled wrapper with props:
- `title`
- `open`
- `onToggle`
- `children`
- optional `className`
- optional `headerClassName`
- optional `contentClassName`
- optional `headerRight`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ui/__tests__/AccordionSection.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ui/AccordionSection.jsx src/components/ui/__tests__/AccordionSection.test.jsx
git commit -m "feat: add shared accordion section"
```

### Task 2: Adopt AccordionSection in GoalsManager

**Files:**
- Modify: `src/components/goals/GoalSetFormSection.jsx`
- Modify: `src/components/goals/AddGoalFormSection.jsx`
- Modify: `src/screens/GoalsManager.jsx`
- Test: `src/screens/__tests__/GoalsManager.test.jsx`
- Test: `src/screens/__tests__/GoalsManagerProgress.test.jsx`

**Step 1: Write the failing test**

Use the existing `GoalsManager` screen tests as the regression harness.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx`
Expected: FAIL after the wrapper adoption starts and before all sections are wired correctly

**Step 3: Write minimal implementation**

Refactor:
- `GoalSetFormSection` to render its form inside `AccordionSection`
- `AddGoalFormSection` to render its form inside `AccordionSection`
- archived sets section in `GoalsManager.jsx` to use `AccordionSection`

Keep the current state ownership in `GoalsManager`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/goals/GoalSetFormSection.jsx src/components/goals/AddGoalFormSection.jsx src/screens/GoalsManager.jsx src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx
git commit -m "refactor: adopt shared accordion in goals manager"
```

### Task 3: Final verification

**Files:**
- Verify only

**Step 1: Run focused tests**

Run: `npm test -- src/components/ui/__tests__/AccordionSection.test.jsx src/hooks/__tests__/useGoalsManagerData.test.jsx src/screens/__tests__/GoalsManager.test.jsx src/screens/__tests__/GoalsManagerProgress.test.jsx`
Expected: PASS

**Step 2: Run broader related suite**

Run: `npm test -- src/lib/__tests__/goal-metrics.test.js src/lib/__tests__/goals-ui.test.js src/lib/__tests__/goals-db.test.js src/components/goals/__tests__/GoalSetCard.test.jsx`
Expected: PASS

**Step 3: Review diff**

Run: `git diff -- src/components/ui/AccordionSection.jsx src/components/goals/GoalSetFormSection.jsx src/components/goals/AddGoalFormSection.jsx src/screens/GoalsManager.jsx`
Expected: only shared accordion extraction changes

**Step 4: Commit**

```bash
git add src/components/ui/AccordionSection.jsx src/components/ui/__tests__/AccordionSection.test.jsx src/components/goals/GoalSetFormSection.jsx src/components/goals/AddGoalFormSection.jsx src/screens/GoalsManager.jsx
git commit -m "refactor: extract shared accordion wrapper"
```
