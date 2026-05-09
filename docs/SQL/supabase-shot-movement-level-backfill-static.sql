-- Backfill legacy catch-and-shoot rows so movement_level is always populated.
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

commit;

-- Notes:
-- - This intentionally treats unknown historical catch-and-shoot rows as static.
-- - Non-catch-and-shoot rows remain null.
