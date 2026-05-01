# GameGate Cleanup Design

**Date:** 2026-05-01

**Goal:** Reduce `GameGate.jsx` screen responsibility by moving workflow state, actions, and view helpers into a screen-facing hook, while keeping the existing behavior and reusing current child components where they still fit.

## Current Problems

- `src/screens/GameGate.jsx` mixes view composition, workflow state, delete/start/resume flows, navigation actions, and display helpers in one file.
- `useGameGateData` now owns loading and grouping, but the screen still owns most of the interaction logic.
- `computeResultSummary`, `fmtDate`, and `homeAwayPill` are view helpers that do not need to live in the screen component.

## Recommended Approach

Use a grouped screen hook plus light UI extraction.

- Keep `useGameGateData` focused on loading game sessions and grouped history data.
- Add a new screen hook, tentatively `useGameGateScreen`, that owns:
  - `showConfirmNew`
  - start/resume/open/delete actions
  - modal confirm/cancel actions
  - game display helpers currently embedded in the screen
- Extract the top start/resume area into a small section component so `GameGate.jsx` becomes mostly composition.

## Component Boundaries

### `GameGate.jsx`

Should become a composition layer that wires:
- `GameGateStartSection`
- `GameHistorySection`
- `GameExistingSessionModal`

### `GameGateStartSection`

Owns the top area that currently includes:
- the `Start New Game` button
- the active-session resume card

This component should remain presentational. It should receive state and callbacks from the screen hook instead of owning workflow logic itself.

### `GameHistorySection`

Keep as-is structurally for this pass. It already owns the game-history display and accordion behavior. It should receive grouped display helpers and actions from the screen hook rather than from the screen component directly.

## Hook Boundary

### `useGameGateData`

Keep responsibility limited to:
- sessions
- active session
- previous sessions
- grouped previous sessions
- `refresh`

### `useGameGateScreen`

New hook should compose `useGameGateData` and return grouped state such as:

- `data`
  - `sessions`
  - `active`
  - `groupedPrev`
- `startUi`
  - `showConfirmNew`
- `display`
  - `computeResultSummary`
  - `fmtDate`
  - `homeAwayPill`
- `startActions`
  - `startNew`
  - `resumeActive`
  - `confirmEndAndStart`
  - `dismissConfirmNew`
- `historyActions`
  - `openDetail`
  - `deleteGame`

The exact group names can adjust slightly, but the public surface should be grouped by responsibility rather than returned as a flat bag.

## Behavior Constraints

- No user-visible behavior changes.
- Keep current start-new behavior when there is no active game.
- Keep current confirm-modal behavior when an active game exists.
- Keep current resume behavior.
- Keep current history accordion behavior.
- Keep current navigation targets and payloads.
- Keep current delete confirmation and error handling behavior.

## Testing Strategy

- Add hook-level tests for the new screen hook contract and workflow behavior.
- Keep the existing `GameGate` screen tests as the regression suite.
- If the start-section extraction is simple enough, rely on screen coverage rather than adding a dedicated component test.

## Out of Scope

- Rewriting `GameHistorySection`
- Changing game grouping behavior
- Changing DB behavior or persistence
- Redesigning the `GameGate` UI
