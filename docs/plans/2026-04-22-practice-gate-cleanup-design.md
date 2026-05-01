# PracticeGate Cleanup Design

**Date:** 2026-04-22

**Goal:** Reduce `PracticeGate.jsx` screen responsibility by moving workflow state and actions into a screen-facing hook, while keeping existing behavior and reusing the current child components where they still fit.

## Current Problems

- `src/screens/PracticeGate.jsx` mixes view composition, workflow state, data access, modal control, outside-click handling, and navigation actions in one file.
- `usePracticeGateData` now owns only loading and derived state, but the screen still holds the rest of the flow logic inline.
- The start/resume area is visually and behaviorally dense, which makes the screen harder to scan and extend.

## Recommended Approach

Use a grouped screen hook plus light UI extraction.

- Keep `usePracticeGateData` focused on loading practice sessions, athlete selection data, and month grouping.
- Add a new screen hook, tentatively `usePracticeGateScreen`, that owns:
  - `showStartCard`
  - `showSwitchAthlete`
  - `existingActiveSession`
  - `openMonth`
  - outside-click close behavior
  - start/resume/open/delete actions
- Extract top-level workflow UI into a small section component so `PracticeGate.jsx` becomes mostly composition.

## Component Boundaries

### `PracticeGate.jsx`

Should become a composition layer that wires:
- `PracticeGateStartSection`
- `PracticeSessionHistory`
- `PracticeExistingSessionModal`

### `PracticeGateStartSection`

Owns the top area that currently switches between:
- the `Start New Session` button
- the chooser/start panel
- the `Resume Active Session` button

This component should remain presentational. It should receive state and callbacks from the screen hook instead of owning workflow logic itself.

### `PracticeSessionHistory`

Keep as-is for this pass. It already has a reasonable boundary and now uses the shared accordion wrapper.

## Hook Boundary

### `usePracticeGateData`

Keep responsibility limited to:
- sessions
- active session
- athletes
- selected athlete state
- grouped month data
- `refresh`

### `usePracticeGateScreen`

New hook should compose `usePracticeGateData` and return grouped state such as:

- `startUi`
  - `showStartCard`
  - `showSwitchAthlete`
  - `canStartForSelectedAthlete`
- `historyUi`
  - `openMonth`
- `modal`
  - `existingActiveSession`
- `data`
  - `sessions`
  - `active`
  - `athletes`
  - `selectedAthlete`
  - `selectedAthleteId`
  - `groupedMonths`
- `actions`
  - `openStartCard`
  - `setShowSwitchAthlete`
  - `setSelectedAthleteId`
  - `setOpenMonth`
  - `startForSelectedAthlete`
  - `resumeActive`
  - `resumeExistingSession`
  - `openSession`
  - `deleteSession`
  - `dismissExistingSession`

The exact group names can adjust slightly, but the public surface should be grouped by responsibility rather than returned as a flat bag.

## Behavior Constraints

- No user-visible behavior changes.
- Keep current athlete-switching behavior.
- Keep current “existing active session” modal flow.
- Keep current history accordion behavior.
- Keep current navigation targets and payloads.

## Testing Strategy

- Add hook-level tests for the new screen hook contract and workflow behavior.
- Keep the existing `PracticeGate` screen tests as the regression suite.
- If a start-section component is extracted, add a focused component test only if it meaningfully reduces ambiguity; otherwise rely on screen coverage.

## Out of Scope

- Rewriting `PracticeSessionHistory`
- Adding a reusable accordion state hook
- Changing data persistence or DB behavior
- Redesigning the `PracticeGate` UI
