-- Link game data to athlete profiles.
-- Run after athlete_profiles exists.

begin;

alter table public.game_sessions
  add column if not exists athlete_id uuid;

alter table public.game_events
  add column if not exists athlete_id uuid;

-- Backfill sessions: pick earliest non-archived athlete per user.
with first_athlete as (
  select distinct on (ap.user_id) ap.user_id, ap.id as athlete_id
  from public.athlete_profiles ap
  where ap.archived_at is null
  order by ap.user_id, ap.created_at asc
)
update public.game_sessions gs
set athlete_id = fa.athlete_id
from first_athlete fa
where gs.user_id = fa.user_id
  and gs.athlete_id is null;

-- Backfill events from their parent session when possible.
update public.game_events ge
set athlete_id = gs.athlete_id
from public.game_sessions gs
where ge.game_id = gs.id
  and ge.athlete_id is null;

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
    where conname = 'game_sessions_athlete_user_fkey'
  ) then
    alter table public.game_sessions
      add constraint game_sessions_athlete_user_fkey
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
    where conname = 'game_events_athlete_user_fkey'
  ) then
    alter table public.game_events
      add constraint game_events_athlete_user_fkey
      foreign key (athlete_id, user_id)
      references public.athlete_profiles(id, user_id)
      on delete restrict;
  end if;
end $$;

create index if not exists game_sessions_user_athlete_idx
  on public.game_sessions(user_id, athlete_id);

create index if not exists game_events_user_athlete_idx
  on public.game_events(user_id, athlete_id);

commit;

-- Optional hardening after verifying no NULLs remain:
-- alter table public.game_sessions alter column athlete_id set not null;
-- alter table public.game_events alter column athlete_id set not null;
