-- Add soft-archive support for athlete profiles.

alter table public.athlete_profiles
  add column if not exists archived_at timestamptz;

create index if not exists athlete_profiles_user_archived_idx
  on public.athlete_profiles(user_id, archived_at);
