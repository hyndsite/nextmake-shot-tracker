-- Add shot movement metadata support for catch-and-shoot and off-dribble shots.
-- Safe to run multiple times.
-- Replaces older catch-and-shoot-only movement_level constraints when present.

begin;

alter table public.practice_entries
  add column if not exists movement_level text;

alter table public.game_events
  add column if not exists movement_level text;

alter table public.practice_entries
  drop constraint if exists practice_entries_movement_level_check;

alter table public.practice_entries
  add constraint practice_entries_movement_level_check
  check (
    movement_level is null
    or movement_level in (
      'static',
      'relocation',
      'on_the_move',
      'controlled',
      'lateral',
      'downhill'
    )
  );

alter table public.game_events
  drop constraint if exists game_events_movement_level_check;

alter table public.game_events
  add constraint game_events_movement_level_check
  check (
    movement_level is null
    or movement_level in (
      'static',
      'relocation',
      'on_the_move',
      'controlled',
      'lateral',
      'downhill'
    )
  );

commit;

-- Notes:
-- - Existing rows remain NULL until the backfill script is run.
-- - Current app behavior writes movement_level for:
--   - catch_shoot: static, relocation, on_the_move
--   - off_dribble: controlled, lateral, downhill
-- - This file intentionally replaces older movement_level constraints that only allowed
--   catch-and-shoot values.
