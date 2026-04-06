# Game Session Level Classification Design

**Date:** 2026-04-06

## Scope
- Expand game session classification beyond the current single `level` dropdown.
- Replace separate school levels with a single `K-12` category plus grade selection.
- Add `College` with academic-season selection.
- Add AAU seasonal selection for `AAU / Travel`.
- Preserve the existing `level` display behavior across the app.

## UX Decisions (Approved)
- Replace the current `Level` choices in the New Game form with:
  - `K-12`
  - `College`
  - `AAU / Travel`
  - `Other`
- Show a conditional second dropdown based on the selected category:
  - `K-12` => grade picker
  - `College` => academic season picker
  - `AAU / Travel` => season picker
  - `Other` => no additional picker
- `K-12` grade choices use explicit labels:
  - `Kindergarten`
  - `First Grade`
  - `Second Grade`
  - `Third Grade`
  - `Fourth Grade`
  - `Fifth Grade`
  - `Sixth Grade`
  - `Seventh Grade`
  - `Eighth Grade`
  - `Ninth Grade`
  - `Tenth Grade`
  - `Eleventh Grade`
  - `Twelfth Grade`
- `College` choices use academic seasons for previous, current, and next school years.
- As of 2026-04-06, the college dropdown should show:
  - `2024-25`
  - `2025-26`
  - `2026-27`
- `AAU / Travel` season choices are:
  - `Winter`
  - `Spring`
  - `Summer`
  - `Fall`
- The game timestamp remains the source of truth for when the game occurred; no year is attached to AAU season values.

## Data Model
- Keep `game_sessions.level` as a human-readable display label.
- Add nullable structured columns to `public.game_sessions`:
  - `level_category text`
  - `level_grade text`
  - `college_season text`
  - `aau_season text`

## Stored Values
- `level_category`
  - `k_12`
  - `college`
  - `aau`
  - `other`
- `level_grade`
  - one of the approved K-12 labels
- `college_season`
  - academic season string in `YYYY-YY` format
- `aau_season`
  - `Winter`
  - `Spring`
  - `Summer`
  - `Fall`

## Derived Display Labels
- Continue rendering `level` in existing screens.
- Build `level` from the structured fields when saving a game session:
  - `K-12 · Kindergarten`
  - `K-12 · Seventh Grade`
  - `College · 2025-26`
  - `AAU / Travel · Summer`
  - `Other`

## Validation Rules
- `level_category = k_12` requires `level_grade`.
- `level_category = college` requires `college_season`.
- `level_category = aau` requires `aau_season`.
- `level_category = other` requires none of the detail fields.
- Only the detail field that matches the selected category should be populated.
- Changing categories in the UI clears stale values from the other detail fields before save.

## Backward Compatibility
- Existing rows keep their current `level` values.
- Existing screens continue to function because they already display `level`.
- New rows save both:
  - structured classification fields for future filtering/reporting
  - derived `level` for current UI compatibility
- No backfill is required for legacy rows in V1.

## Implementation Notes
- Centralize options and label-building logic in constants/helpers rather than embedding them directly in the screen.
- Default category should remain aligned with the current default user flow, but use the new model.
- Tests should cover:
  - default selections
  - conditional dropdown rendering
  - saved payload structure
  - derived `level` label generation
  - legacy compatibility where `level` still renders in game detail/logger views
