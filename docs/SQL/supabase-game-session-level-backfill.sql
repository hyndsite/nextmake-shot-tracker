-- Backfill legacy game session level labels into the structured classification fields.
-- Run after docs/SQL/supabase-game-session-level-classification.sql.

begin;

-- Legacy AAU / Travel rows from Winter season.
update public.game_sessions
set
  level = 'AAU / Travel · Winter · 7th Grade',
  level_category = 'aau',
  level_grade = null,
  college_season = null,
  aau_season = 'Winter',
  aau_competition_level = '7th Grade'
where level = 'AAU / Travel'
  and date_iso >= date '2025-12-01'
  and date_iso <= date '2026-02-28';

-- Legacy AAU / Travel rows from Spring season and later.
update public.game_sessions
set
  level = 'AAU / Travel · Spring · 7th Grade',
  level_category = 'aau',
  level_grade = null,
  college_season = null,
  aau_season = 'Spring',
  aau_competition_level = '7th Grade'
where level = 'AAU / Travel'
  and date_iso >= date '2026-03-01';

-- Legacy Middle School rows map to K-12 7th Grade.
update public.game_sessions
set
  level = 'K-12 · 7th Grade',
  level_category = 'k_12',
  level_grade = '7th Grade',
  college_season = null,
  aau_season = null,
  aau_competition_level = null
where level = 'Middle School';

commit;
