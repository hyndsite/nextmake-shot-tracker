-- Run this in Supabase SQL Editor before using athlete profile creation.

create table if not exists public.athlete_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text,
  initials text not null,
  avatar_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athlete_profiles_first_name_len check (char_length(first_name) between 1 and 20),
  constraint athlete_profiles_last_name_len check (last_name is null or char_length(last_name) <= 20)
);

create index if not exists athlete_profiles_user_id_idx on public.athlete_profiles(user_id);

alter table public.athlete_profiles enable row level security;

create policy if not exists "athlete_profiles_select_own"
  on public.athlete_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy if not exists "athlete_profiles_insert_own"
  on public.athlete_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy if not exists "athlete_profiles_update_own"
  on public.athlete_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "athlete_profiles_delete_own"
  on public.athlete_profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);
