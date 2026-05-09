# Current Project Context

**Last Updated:** 2026-05-09

This is the rolling context file for fast restart in later sessions. Use it as the current-state snapshot, and use the timestamped files in this folder for deeper design or implementation history.

## Current Status

- Major screen cleanup pass is complete for:
  - `src/screens/Dashboard.jsx`
  - `src/screens/GoalsManager.jsx`
  - `src/screens/PracticeGate.jsx`
  - `src/screens/GameGate.jsx`
  - `src/screens/Performance.jsx`
  - `src/screens/Heatmap.jsx`
  - `src/screens/Login.jsx`
- Shared accordion rollout is complete across the main repeated history/section surfaces.
- `window.confirm(...)` flows have been replaced with in-app confirm modals in the previously identified remaining cases.

## Latest Completed Work

- Added persisted `movement_level` metadata for catch-and-shoot shots in:
  - `src/screens/PracticeLog.jsx`
  - `src/screens/GameLogger.jsx`
- Storage and sync now carry `movement_level` through:
  - `src/lib/practice-db.js`
  - `src/lib/game-db.js`
  - `src/lib/sync.js`
- Logger behavior for this field:
  - shown only when `shot_type === "catch_shoot"`
  - dropdown with `static`, `relocation`, `on_the_move`
  - defaults to `static`
  - cleared to `null` for non-catch-and-shoot shots
  - supported in create and edit flows

## Current Conventions

- Prefer screen composition files with screen orchestration hooks for workflow-heavy screens.
- Prefer reusable UI wrappers for repeated containers like accordion shells.
- Prefer in-app `ActionConfirmModal` confirmation flows over `window.confirm(...)`.
- Keep durable session/project continuity in `docs/plans/`.

## Remaining Likely Cleanup Queue

Suggested next structural review order:

1. `src/screens/GameLogger.jsx`
2. `src/screens/PracticeLog.jsx`
3. `src/screens/GameNew.jsx`
4. `src/screens/GameDetail.jsx`
5. `src/screens/ModeGate.jsx`
6. `src/screens/Account.jsx` only if a fresh review still finds worthwhile work

## Related History

- `docs/plans/2026-05-01-screen-cleanup-context.md`
- `docs/plans/2026-05-09-session-context.md`
- `docs/plans/2026-05-09-catch-shoot-movement-level-design.md`
- `docs/plans/2026-05-09-catch-shoot-movement-level.md`
