-- Harden goals athlete linkage after backfill is complete.
-- Safe to run after supabase-goals-athlete-link.sql.

begin;

do $$
declare
  goal_sets_null_count bigint;
  goals_null_count bigint;
begin
  select count(*) into goal_sets_null_count
  from public.goal_sets
  where athlete_id is null;

  select count(*) into goals_null_count
  from public.goals
  where athlete_id is null;

  if goal_sets_null_count > 0 or goals_null_count > 0 then
    raise exception
      'Cannot set NOT NULL: goal_sets null athlete_id=% , goals null athlete_id=%',
      goal_sets_null_count,
      goals_null_count;
  end if;
end $$;

alter table public.goal_sets
  alter column athlete_id set not null;

alter table public.goals
  alter column athlete_id set not null;

commit;
