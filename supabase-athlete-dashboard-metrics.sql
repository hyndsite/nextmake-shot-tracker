-- Per-athlete configurable dashboard metric cards (max 5, ordered).
-- Run after athlete_profiles exists.

begin;

create table if not exists public.athlete_dashboard_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  athlete_id uuid not null references public.athlete_profiles(id) on delete cascade,
  metric_key text not null,
  range_key text not null,
  source_mode text not null default 'both',
  position int not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athlete_dashboard_metrics_metric_key_len
    check (char_length(metric_key) between 1 and 64),
  constraint athlete_dashboard_metrics_range_chk
    check (range_key in ('7d', '30d', '90d', '180d', '1y')),
  constraint athlete_dashboard_metrics_source_mode_chk
    check (source_mode in ('game', 'practice', 'both')),
  constraint athlete_dashboard_metrics_position_chk
    check (position between 0 and 4),
  constraint athlete_dashboard_metrics_athlete_position_uniq
    unique (athlete_id, position)
);

alter table public.athlete_dashboard_metrics
  add column if not exists source_mode text not null default 'both';

alter table public.athlete_dashboard_metrics
  drop constraint if exists athlete_dashboard_metrics_source_mode_chk;

alter table public.athlete_dashboard_metrics
  add constraint athlete_dashboard_metrics_source_mode_chk
  check (source_mode in ('game', 'practice', 'both'));

create index if not exists athlete_dashboard_metrics_user_idx
  on public.athlete_dashboard_metrics(user_id);

create index if not exists athlete_dashboard_metrics_athlete_idx
  on public.athlete_dashboard_metrics(athlete_id);

-- Keep updated_at fresh.
create or replace function public.set_athlete_dashboard_metrics_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_athlete_dashboard_metrics_updated_at
  on public.athlete_dashboard_metrics;

create trigger trg_athlete_dashboard_metrics_updated_at
before update on public.athlete_dashboard_metrics
for each row
execute function public.set_athlete_dashboard_metrics_updated_at();

alter table public.athlete_dashboard_metrics enable row level security;

drop policy if exists "athlete_dashboard_metrics_select_own"
  on public.athlete_dashboard_metrics;
drop policy if exists "athlete_dashboard_metrics_insert_own"
  on public.athlete_dashboard_metrics;
drop policy if exists "athlete_dashboard_metrics_update_own"
  on public.athlete_dashboard_metrics;
drop policy if exists "athlete_dashboard_metrics_delete_own"
  on public.athlete_dashboard_metrics;

create policy "athlete_dashboard_metrics_select_own"
  on public.athlete_dashboard_metrics
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.athlete_profiles ap
      where ap.id = athlete_dashboard_metrics.athlete_id
        and ap.user_id = auth.uid()
    )
  );

create policy "athlete_dashboard_metrics_insert_own"
  on public.athlete_dashboard_metrics
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.athlete_profiles ap
      where ap.id = athlete_dashboard_metrics.athlete_id
        and ap.user_id = auth.uid()
    )
  );

create policy "athlete_dashboard_metrics_update_own"
  on public.athlete_dashboard_metrics
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.athlete_profiles ap
      where ap.id = athlete_dashboard_metrics.athlete_id
        and ap.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.athlete_profiles ap
      where ap.id = athlete_dashboard_metrics.athlete_id
        and ap.user_id = auth.uid()
    )
  );

create policy "athlete_dashboard_metrics_delete_own"
  on public.athlete_dashboard_metrics
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.athlete_profiles ap
      where ap.id = athlete_dashboard_metrics.athlete_id
        and ap.user_id = auth.uid()
    )
  );

commit;
