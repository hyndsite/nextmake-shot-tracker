-- Link goals data to athlete profiles.
-- Run after athlete_profiles exists.

begin;

alter table public.goal_sets
  add column if not exists athlete_id uuid;

alter table public.goals
  add column if not exists athlete_id uuid;

-- Backfill goal sets: pick earliest non-archived athlete per user.
with first_athlete as (
  select distinct on (ap.user_id) ap.user_id, ap.id as athlete_id
  from public.athlete_profiles ap
  where ap.archived_at is null
  order by ap.user_id, ap.created_at asc
)
update public.goal_sets gs
set athlete_id = fa.athlete_id
from first_athlete fa
where gs.user_id = fa.user_id
  and gs.athlete_id is null;

-- Backfill goals from parent goal set when possible.
update public.goals g
set athlete_id = gs.athlete_id
from public.goal_sets gs
where g.set_id = gs.id
  and g.athlete_id is null;

-- Remaining backfill: first athlete per user.
with first_athlete as (
  select distinct on (ap.user_id) ap.user_id, ap.id as athlete_id
  from public.athlete_profiles ap
  where ap.archived_at is null
  order by ap.user_id, ap.created_at asc
)
update public.goals g
set athlete_id = fa.athlete_id
from first_athlete fa
where g.user_id = fa.user_id
  and g.athlete_id is null;

-- Composite unique key so FK can enforce athlete belongs to same user.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'athlete_profiles_id_user_id_uniq'
  ) then
    alter table public.athlete_profiles
      add constraint athlete_profiles_id_user_id_uniq unique (id, user_id);
  end if;
end $$;

-- FK integrity: athlete must belong to same user.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'goal_sets_athlete_user_fkey'
  ) then
    alter table public.goal_sets
      add constraint goal_sets_athlete_user_fkey
      foreign key (athlete_id, user_id)
      references public.athlete_profiles(id, user_id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'goals_athlete_user_fkey'
  ) then
    alter table public.goals
      add constraint goals_athlete_user_fkey
      foreign key (athlete_id, user_id)
      references public.athlete_profiles(id, user_id)
      on delete restrict;
  end if;
end $$;

create index if not exists goal_sets_user_athlete_idx
  on public.goal_sets(user_id, athlete_id);

create index if not exists goals_user_athlete_idx
  on public.goals(user_id, athlete_id);

commit;

-- Optional hardening after verifying no NULLs remain:
-- alter table public.goal_sets alter column athlete_id set not null;
-- alter table public.goals alter column athlete_id set not null;
