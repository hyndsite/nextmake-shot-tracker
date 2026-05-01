# PracticeGate Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `PracticeGate` into a composition-first screen by moving workflow state and actions into a dedicated screen hook and extracting the top workflow UI into a small presentational section.

**Architecture:** Keep `usePracticeGateData` as the loading and derived-state boundary, add a new `usePracticeGateScreen` orchestration hook for UI/workflow state, and extract the start/resume block into a small section component. Preserve the current screen behavior and child component contracts where possible.

**Tech Stack:** React, Vitest, Testing Library, Vite

---

### Task 1: Define the new screen hook contract with failing tests

**Files:**
- Create: `src/hooks/__tests__/usePracticeGateScreen.test.jsx`
- Create: `src/hooks/usePracticeGateScreen.js`
- Modify: `src/hooks/usePracticeGateData.js` only if needed for composability

**Step 1: Write the failing test**

Add tests that define the new hook contract and workflow behavior:
- grouped return surface for data, UI state, and actions
- opening the start card
- closing the start card via the exposed dismiss action
- selecting an athlete and starting a new session
- surfacing an existing active session instead of creating a new one

**Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/__tests__/usePracticeGateScreen.test.jsx`
Expected: FAIL because the hook does not exist yet

**Step 3: Write minimal implementation**

Create `usePracticeGateScreen.js` that composes `usePracticeGateData` and owns:
- `showStartCard`
- `showSwitchAthlete`
- `existingActiveSession`
- `openMonth`
- start/resume/open/delete actions

Do not move view markup in this task.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/__tests__/usePracticeGateScreen.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/usePracticeGateScreen.js src/hooks/__tests__/usePracticeGateScreen.test.jsx
git commit -m "refactor: add practice gate screen hook"
```

### Task 2: Extract the top workflow section

**Files:**
- Create: `src/components/PracticeGateStartSection.jsx`
- Create or Modify: `src/components/__tests__/PracticeGateStartSection.test.jsx` if needed
- Modify: `src/screens/PracticeGate.jsx`

**Step 1: Write the failing test**

Use the existing `PracticeGate` screen tests as the regression harness. If the extracted section needs a focused test for prop wiring clarity, add one minimal component test.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/__tests__/PracticeGate.test.jsx`
Expected: FAIL after `PracticeGate.jsx` begins consuming the new hook/component split and before all wiring is updated

**Step 3: Write minimal implementation**

Extract the top area into `PracticeGateStartSection.jsx` covering:
- `Start New Session` button
- chooser/start panel state
- `Resume Active Session` button

Keep the component presentational and drive it entirely from props.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/screens/__tests__/PracticeGate.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/PracticeGateStartSection.jsx src/screens/PracticeGate.jsx src/screens/__tests__/PracticeGate.test.jsx
git commit -m "refactor: extract practice gate start section"
```

### Task 3: Move outside-click dismissal into the screen hook

**Files:**
- Modify: `src/hooks/usePracticeGateScreen.js`
- Modify: `src/screens/PracticeGate.jsx`
- Test: `src/screens/__tests__/PracticeGate.test.jsx`

**Step 1: Write the failing test**

Use the existing outside-click regression in `PracticeGate.test.jsx` as the behavioral guard.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/__tests__/PracticeGate.test.jsx`
Expected: FAIL while the dismissal logic is being moved out of the screen

**Step 3: Write minimal implementation**

Move the outside-click close behavior into the screen hook so `PracticeGate.jsx` no longer owns the event listener directly. Expose the necessary `chooserRef` and dismiss action from the hook.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/screens/__tests__/PracticeGate.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/usePracticeGateScreen.js src/screens/PracticeGate.jsx src/screens/__tests__/PracticeGate.test.jsx
git commit -m "refactor: move practice gate chooser workflow into hook"
```

### Task 4: Final verification

**Files:**
- Verify only

**Step 1: Run focused tests**

Run: `npm test -- src/hooks/__tests__/usePracticeGateData.test.jsx src/hooks/__tests__/usePracticeGateScreen.test.jsx src/screens/__tests__/PracticeGate.test.jsx`
Expected: PASS

**Step 2: Run related component tests**

Run: `npm test -- src/components/__tests__/PracticeSessionHistory.test.jsx`
Expected: PASS

**Step 3: Review diff**

Run: `git diff -- src/screens/PracticeGate.jsx src/hooks/usePracticeGateData.js src/hooks/usePracticeGateScreen.js src/components/PracticeGateStartSection.jsx`
Expected: screen logic moved into hook and extracted section without behavior changes

**Step 4: Commit**

```bash
git add src/screens/PracticeGate.jsx src/hooks/usePracticeGateScreen.js src/components/PracticeGateStartSection.jsx src/hooks/__tests__/usePracticeGateScreen.test.jsx
git commit -m "refactor: simplify practice gate screen flow"
```
