# Catch And Shoot Movement Level Design

**Goal:** Add persisted `movement_level` metadata for catch-and-shoot shots in both practice and game logging.

**Summary:** When a user selects `Catch & Shoot`, the logger should capture one of three values: `static`, `relocation`, or `on_the_move`. This value should be persisted in local storage and sync payloads, survive reload/edit flows, and remain hidden for other shot types in this pass.

**Scope**
- Practice logger capture and edit support
- Game logger capture and edit support
- Local DB persistence for practice entries and game events
- Sync whitelist support so the field reaches Supabase
- Test coverage for DB writes, sync payloads, and logger behavior

**Out of Scope**
- Displaying `movement_level` in `GameDetail`
- New analytics or filtering behavior in heatmap/performance
- Reusing `movement_level` for non-catch-and-shoot shot types

**UI Behavior**
- Show `movement_level` only when `shot_type === "catch_shoot"`.
- Options:
  - `static`
  - `relocation`
  - `on_the_move`
- Default to `static` for new catch-and-shoot shots.
- Clear `movement_level` back to `null` when switching away from catch-and-shoot.
- Existing shots without the field continue to load without breakage.

**Data Model**
- Add nullable `movement_level` to:
  - practice entries
  - game events
- Store values exactly as:
  - `static`
  - `relocation`
  - `on_the_move`
- For non-catch-and-shoot shots in this pass, persist `null`.

**Implementation Notes**
- Centralize movement-level options in `src/constants/shotTypes.js`.
- Follow the existing layup-metadata pattern:
  - logger UI owns conditional rendering
  - persistence layer accepts camelCase and snake_case
  - sync layer explicitly whitelists the new field
- Editing a shot should preload any saved `movement_level`.

**Testing**
- Add failing tests first for:
  - `practice-db.addEntry` / `updateEntry`
  - `game-db.addGameEvent`
  - sync whitelist behavior for practice and game rows
  - `PracticeLog` conditional UI and save/edit behavior
  - `GameLogger` conditional modal UI and save/edit behavior

