# GameGate Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `GameGate` into a composition-first screen by moving workflow state, actions, and view helpers into a dedicated screen hook and extracting the top start/resume area into a small presentational section.

**Architecture:** Keep `useGameGateData` as the loading and grouped-history boundary, add a new `useGameGateScreen` orchestration hook for UI/workflow state and display helpers, and extract the start/resume block into a small section component. Preserve the current screen behavior and child component contracts where possible.

**Tech Stack:** React, Vitest, Testing Library, Vite

---

### Task 1: Define the new screen hook contract with failing tests

**Files:**
- Create: `src/hooks/__tests__/useGameGateScreen.test.jsx`
- Create: `src/hooks/useGameGateScreen.js`

**Step 1: Write the failing test**

Add tests that define the new hook contract and workflow behavior:
- grouped return surface for data, UI state, display helpers, and actions
- starting a new game when no active game exists
- surfacing the confirm state when an active game exists
- confirming end-and-start behavior
- resume behavior
- delete behavior including refresh and failed-delete alert path

**Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/__tests__/useGameGateScreen.test.jsx`
Expected: FAIL because the hook does not exist yet

**Step 3: Write minimal implementation**

Create `useGameGateScreen.js` that composes `useGameGateData` and owns:
- `showConfirmNew`
- start/resume/open/delete actions
- confirm modal actions
- `computeResultSummary`
- `fmtDate`
- `homeAwayPill`

Do not move view markup in this task.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/__tests__/useGameGateScreen.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useGameGateScreen.js src/hooks/__tests__/useGameGateScreen.test.jsx
git commit -m "refactor: add game gate screen hook"
```

### Task 2: Extract the top workflow section

**Files:**
- Create: `src/components/GameGateStartSection.jsx`
- Modify: `src/screens/GameGate.jsx`

**Step 1: Write the failing test**

Use the existing `GameGate` screen tests as the regression harness.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/__tests__/GameGate.test.jsx`
Expected: FAIL after `GameGate.jsx` begins consuming the new hook/component split and before all wiring is updated

**Step 3: Write minimal implementation**

Extract the top area into `GameGateStartSection.jsx` covering:
- `Start New Game` button
- active game resume card

Keep the component presentational and drive it entirely from props.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/screens/__tests__/GameGate.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/GameGateStartSection.jsx src/screens/GameGate.jsx
git commit -m "refactor: extract game gate start section"
```

### Task 3: Route history and modal wiring through the screen hook

**Files:**
- Modify: `src/screens/GameGate.jsx`
- Modify: `src/hooks/useGameGateScreen.js`
- Test: `src/screens/__tests__/GameGate.test.jsx`

**Step 1: Write the failing test**

Use the existing screen tests for:
- open detail
- delete confirmation
- delete failure alert
- modal cancel and confirm behavior

**Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/__tests__/GameGate.test.jsx`
Expected: FAIL while the screen wiring is being moved to the new grouped hook contract

**Step 3: Write minimal implementation**

Update `GameGate.jsx` to consume:
- `data`
- `startUi`
- `display`
- `startActions`
- `historyActions`

Pass display helpers and delete/open handlers into `GameHistorySection` from the hook instead of defining them in the screen.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/screens/__tests__/GameGate.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/screens/GameGate.jsx src/hooks/useGameGateScreen.js
git commit -m "refactor: move game gate workflow into screen hook"
```

### Task 4: Final verification

**Files:**
- Verify only

**Step 1: Run focused tests**

Run: `npm test -- src/hooks/__tests__/useGameGateData.test.jsx src/hooks/__tests__/useGameGateScreen.test.jsx src/screens/__tests__/GameGate.test.jsx`
Expected: PASS

**Step 2: Run related component and lib tests**

Run: `npm test -- src/components/__tests__/GameHistorySection.test.jsx src/lib/__tests__/game-gate.test.js`
Expected: PASS

**Step 3: Review diff**

Run: `git diff -- src/screens/GameGate.jsx src/hooks/useGameGateScreen.js src/components/GameGateStartSection.jsx`
Expected: screen logic moved into hook and extracted section without behavior changes

**Step 4: Commit**

```bash
git add src/screens/GameGate.jsx src/hooks/useGameGateScreen.js src/components/GameGateStartSection.jsx src/hooks/__tests__/useGameGateScreen.test.jsx
git commit -m "refactor: simplify game gate screen flow"
```
