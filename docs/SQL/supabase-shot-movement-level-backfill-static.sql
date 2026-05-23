-- Backfill legacy catch-and-shoot and off-dribble rows so movement_level is always populated.
-- Run after docs/SQL/supabase-shot-movement-level.sql.

begin;

update public.practice_entries
set movement_level = 'static'
where shot_type = 'catch_shoot'
  and movement_level is null;

update public.game_events
set movement_level = 'static'
where shot_type = 'catch_shoot'
  and movement_level is null;

update public.practice_entries
set movement_level = 'controlled'
where shot_type = 'off_dribble'
  and movement_level is null;

update public.game_events
set movement_level = 'controlled'
where shot_type = 'off_dribble'
  and movement_level is null;

commit;

-- Notes:
-- - This intentionally treats unknown historical catch-and-shoot rows as static.
-- - This intentionally treats unknown historical off-dribble rows as controlled.
-- - Other shot types remain null.
