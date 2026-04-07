-- Add structured level classification fields for game sessions.
-- Keeps legacy `level` rows valid while allowing new categorized entries.

begin;

alter table public.game_sessions
  add column if not exists level_category text,
  add column if not exists level_grade text,
  add column if not exists college_season text,
  add column if not exists aau_season text,
  add column if not exists aau_competition_level text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_sessions_level_category_check'
  ) then
    alter table public.game_sessions
      add constraint game_sessions_level_category_check
      check (
        level_category is null
        or level_category = any (array['k_12'::text, 'college'::text, 'aau'::text, 'other'::text])
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_sessions_aau_competition_level_check'
  ) then
    alter table public.game_sessions
      add constraint game_sessions_aau_competition_level_check
      check (
        aau_competition_level is null
        or aau_competition_level = any (
          array[
            'Kindergarten'::text,
            '1st Grade'::text,
            '2nd Grade'::text,
            '3rd Grade'::text,
            '4th Grade'::text,
            '5th Grade'::text,
            '6th Grade'::text,
            '7th Grade'::text,
            '8th Grade'::text,
            '9th Grade'::text,
            '10th Grade'::text,
            '11th Grade'::text,
            '12th Grade'::text,
            'College'::text,
            'Adult'::text
          ]
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_sessions_level_grade_check'
  ) then
    alter table public.game_sessions
      add constraint game_sessions_level_grade_check
      check (
        level_grade is null
        or level_grade = any (
          array[
            'Kindergarten'::text,
            '1st Grade'::text,
            '2nd Grade'::text,
            '3rd Grade'::text,
            '4th Grade'::text,
            '5th Grade'::text,
            '6th Grade'::text,
            '7th Grade'::text,
            '8th Grade'::text,
            '9th Grade'::text,
            '10th Grade'::text,
            '11th Grade'::text,
            '12th Grade'::text
          ]
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_sessions_aau_season_check'
  ) then
    alter table public.game_sessions
      add constraint game_sessions_aau_season_check
      check (
        aau_season is null
        or aau_season = any (array['Winter'::text, 'Spring'::text, 'Summer'::text, 'Fall'::text])
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_sessions_college_season_format_check'
  ) then
    alter table public.game_sessions
      add constraint game_sessions_college_season_format_check
      check (
        college_season is null
        or (
          college_season ~ '^[0-9]{4}-[0-9]{2}$'
          and right(college_season, 2)::integer
            = mod(left(college_season, 4)::integer + 1, 100)
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_sessions_level_detail_combo_check'
  ) then
    alter table public.game_sessions
      add constraint game_sessions_level_detail_combo_check
      check (
        level_category is null
        or (
          level_category = 'k_12'
          and level_grade is not null
          and college_season is null
          and aau_season is null
          and aau_competition_level is null
        )
        or (
          level_category = 'college'
          and level_grade is null
          and college_season is not null
          and aau_season is null
          and aau_competition_level is null
        )
        or (
          level_category = 'aau'
          and level_grade is null
          and college_season is null
          and aau_season is not null
          and aau_competition_level is not null
        )
        or (
          level_category = 'other'
          and level_grade is null
          and college_season is null
          and aau_season is null
          and aau_competition_level is null
        )
      );
  end if;
end $$;

commit;
