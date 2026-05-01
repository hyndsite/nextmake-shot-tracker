# Screen Cleanup Context

**Date:** 2026-05-01

This note captures the current screen-cleanup status so a later session can pick up without reconstructing the history.

## Screens With Major Cleanup Completed

- `src/screens/Dashboard.jsx`
- `src/screens/GoalsManager.jsx`
- `src/screens/PracticeGate.jsx`
- `src/screens/GameGate.jsx`
- `src/screens/Performance.jsx`
- `src/screens/Heatmap.jsx`
- `src/screens/Login.jsx`

## Screen With Meaningful Prior Cleanup

- `src/screens/Account.jsx`

This screen has meaningful prior work in the repo history, but it is not as clearly part of the most recent cleanup sequence as the screens above.

## Screens Most Likely Still Remaining

- `src/screens/GameDetail.jsx`
- `src/screens/GameLogger.jsx`
- `src/screens/GameNew.jsx`
- `src/screens/ModeGate.jsx`
- `src/screens/PracticeLog.jsx`

## Recent Completed Cleanup Sequence

- `GoalsManager`
  - reviewed dependencies and separation of concerns
  - extracted forms/cards/helpers
  - split and regrouped hook API
- shared accordion rollout
  - reusable `AccordionSection`
  - adopted in goals, practice history, and game history
- `PracticeGate`
  - extracted `usePracticeGateScreen`
  - extracted `PracticeGateStartSection`
  - tightened grouped hook/component APIs
- `GameGate`
  - extracted `useGameGateScreen`
  - extracted `GameGateStartSection`
  - tightened grouped hook/component APIs

## Performance Status

`Performance` has already gone through several earlier cleanup passes in git history, including:

- `COMP: Finished Performance data hook cleanup`
- `COMP: Finished Performance shared section cleanup`
- `COMP: Finished Performance component folder extraction`
- `COMP: Finished Performance pill component cleanup`
- `COMP: Finished Performance screen wrap-up cleanup`
- later follow-up: `refactor: simplify performance and gate data helpers`

Because of that, `Performance` is not the strongest next candidate for another large structural pass unless a fresh review finds a specific remaining problem.

## Recommended Remaining Queue

Suggested next review order:

1. `src/screens/GameLogger.jsx`
2. `src/screens/PracticeLog.jsx`
3. `src/screens/GameNew.jsx`
4. `src/screens/GameDetail.jsx`
5. `src/screens/ModeGate.jsx`
6. `src/screens/Account.jsx` only if a fresh pass still finds worthwhile cleanup

## Notes For A Later Session

- `PracticeGate` and `GameGate` should be treated as cleanup-complete unless only minor polish is desired.
- `Performance` should be re-reviewed before assuming it needs more major refactoring.
- The remaining likely work is concentrated in the game/practice logging screens and smaller gateway/detail screens.
