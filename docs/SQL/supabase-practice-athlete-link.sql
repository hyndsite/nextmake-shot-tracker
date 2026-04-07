-- Link practice data to athlete profiles.
-- Run after athlete_profiles exists.

begin;

alter table public.practice_sessions
  add column if not exists athlete_id uuid;

alter table public.practice_entries
  add column if not exists athlete_id uuid;

alter table public.practice_markers
  add column if not exists athlete_id uuid;

-- Backfill sessions: pick earliest non-archived athlete per user.
with first_athlete as (
  select distinct on (ap.user_id) ap.user_id, ap.id as athlete_id
  from public.athlete_profiles ap
  where ap.archived_at is null
  order by ap.user_id, ap.created_at asc
)
update public.practice_sessions ps
set athlete_id = fa.athlete_id
from first_athlete fa
where ps.user_id = fa.user_id
  and ps.athlete_id is null;

-- Backfill entries from their parent session when possible.
update public.practice_entries pe
set athlete_id = ps.athlete_id
from public.practice_sessions ps
where pe.session_id = ps.id
  and pe.athlete_id is null;

-- Backfill markers from their parent session when possible.
update public.practice_markers pm
set athlete_id = ps.athlete_id
from public.practice_sessions ps
where pm.session_id = ps.id
  and pm.athlete_id is null;

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
    where conname = 'practice_sessions_athlete_user_fkey'
  ) then
    alter table public.practice_sessions
      add constraint practice_sessions_athlete_user_fkey
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
    where conname = 'practice_entries_athlete_user_fkey'
  ) then
    alter table public.practice_entries
      add constraint practice_entries_athlete_user_fkey
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
    where conname = 'practice_markers_athlete_user_fkey'
  ) then
    alter table public.practice_markers
      add constraint practice_markers_athlete_user_fkey
      foreign key (athlete_id, user_id)
      references public.athlete_profiles(id, user_id)
      on delete restrict;
  end if;
end $$;

create index if not exists practice_sessions_user_athlete_idx
  on public.practice_sessions(user_id, athlete_id);

create index if not exists practice_entries_user_athlete_idx
  on public.practice_entries(user_id, athlete_id);

create index if not exists practice_markers_user_athlete_idx
  on public.practice_markers(user_id, athlete_id);

commit;

-- Optional hardening after verifying no NULLs remain:
-- alter table public.practice_sessions alter column athlete_id set not null;
-- alter table public.practice_entries alter column athlete_id set not null;
-- alter table public.practice_markers alter column athlete_id set not null;
