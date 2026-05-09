-- Add catch-and-shoot movement metadata support.
-- Safe to run multiple times.

begin;

alter table public.practice_entries
  add column if not exists movement_level text;

alter table public.game_events
  add column if not exists movement_level text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'practice_entries_movement_level_check'
  ) then
    alter table public.practice_entries
      add constraint practice_entries_movement_level_check
      check (
        movement_level is null
        or movement_level in ('static', 'relocation', 'on_the_move')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_events_movement_level_check'
  ) then
    alter table public.game_events
      add constraint game_events_movement_level_check
      check (
        movement_level is null
        or movement_level in ('static', 'relocation', 'on_the_move')
      );
  end if;
end $$;

commit;

-- Notes:
-- - Existing rows remain NULL.
-- - Current app behavior only writes movement_level for catch_shoot shots.
-- - If movement_level is later generalized to other shot types, this file does not need to change
--   unless the allowed values themselves change.
