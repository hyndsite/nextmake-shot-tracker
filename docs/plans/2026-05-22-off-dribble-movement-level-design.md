# Off-Dribble Movement Level Design

**Goal:** Extend `movement_level` metadata so off-dribble shots capture their own persisted movement classification in both practice and game logging.

**Summary:** The app already stores `movement_level` for `catch_shoot` shots. This change extends the same field to `off_dribble`, but with a different option set: `controlled`, `lateral`, and `downhill`. The value should persist in local storage and sync payloads, survive reload/edit flows, and default legacy off-dribble rows to `controlled`.

**Scope**
- Practice logger capture and edit support for off-dribble movement level
- Game logger capture and edit support for off-dribble movement level
- Local DB normalization and persistence for practice entries and game events
- Sync whitelist support so off-dribble movement values reach Supabase
- SQL migration and backfill for existing off-dribble rows with missing `movement_level`
- Test coverage for DB writes, sync payloads, normalization, and logger behavior

**Out of Scope**
- New performance, heatmap, or goal analytics based on off-dribble movement level
- Changes to `GameDetail` presentation
- Introducing a second metadata field just for off-dribble shots
- Generalizing the metadata model beyond `catch_shoot` and `off_dribble`

**Approach**
- Keep a single `movement_level` field on practice entries and game events.
- Make the allowed values depend on `shot_type`.
- Reuse the existing catch-and-shoot plumbing rather than adding a separate off-dribble-only column.

**Rationale**
- `Controlled`: minimal movement or balanced shot creation such as a one-dribble pull-up, hesitation pull-up, or stop-and-pop
- `Lateral`: side-to-side or separation movement such as a crossover pull-up, step-back, side-step, or escape dribble
- `Downhill`: forward attacking momentum such as a drive pull-up, attacking elbow jumper, or transition pull-up

**UI Behavior**
- Show `movement_level` when `shot_type === "catch_shoot"` or `shot_type === "off_dribble"`.
- Catch-and-shoot options remain:
  - `static`
  - `relocation`
  - `on_the_move`
- Off-dribble options become:
  - `controlled`
  - `lateral`
  - `downhill`
- Default new catch-and-shoot shots to `static`.
- Default new off-dribble shots to `controlled`.
- When switching between shot types, reset the movement-level selection to that shot type's default.
- When switching away from either supported shot type, clear `movement_level` back to `null`.
- Editing an existing shot should preload the saved `movement_level` and allow updates.

**Data Model**
- Continue using nullable `movement_level` on:
  - practice entries
  - game events
- Store catch-and-shoot values exactly as:
  - `static`
  - `relocation`
  - `on_the_move`
- Store off-dribble values exactly as:
  - `controlled`
  - `lateral`
  - `downhill`
- For unsupported shot types, persist `null`.

**Persistence And Migration**
- Update local normalization logic so defaults are keyed by `shot_type`, not catch-and-shoot alone.
- Backfill existing `off_dribble` rows with `NULL` `movement_level` to `controlled`.
- Update SQL checks and notes so `movement_level` explicitly permits both the catch-and-shoot and off-dribble value sets.
- Keep existing catch-and-shoot rows unchanged.

**Implementation Notes**
- Centralize movement-level definitions in `src/constants/shotTypes.js`.
- Keep logger UI responsible for conditional rendering and option selection.
- Keep persistence layers accepting both camelCase and snake_case where that pattern already exists.
- Ensure sync continues to whitelist `movement_level` for `practice_entries` and `game_events`.

**Testing**
- Add failing tests first for:
  - `practice-db.addEntry` / `updateEntry` off-dribble persistence and normalization
  - `game-db.addGameEvent` off-dribble persistence and normalization
  - sync whitelist behavior for off-dribble movement values
  - `PracticeLog` conditional UI, defaults, create flow, and edit flow
  - `GameLogger` conditional UI, defaults, create flow, and edit flow
  - SQL/backfill expectations documented in the migration notes
