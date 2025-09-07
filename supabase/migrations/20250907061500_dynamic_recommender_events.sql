-- Dynamic recommender telemetry (no PII required)
create table if not exists recommendation_events (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  user_id uuid,
  query jsonb not null,
  recommendations jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_recommendation_events_user_time on recommendation_events (user_id, created_at desc);
create index if not exists idx_recommendation_events_session on recommendation_events (session_id);

alter table recommendation_events enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='recommendation_events' and policyname='allow_insert_service'
  ) then
    create policy allow_insert_service on recommendation_events for insert with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='recommendation_events' and policyname='allow_read_anon'
  ) then
    create policy allow_read_anon on recommendation_events for select using (true);
  end if;
end $$;

