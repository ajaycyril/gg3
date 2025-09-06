-- GadgetGuru v1 – Core Database Schema (Supabase/Postgres)
-- Extensions, tables, indexes, RLS, and policies

-- 1) Extensions
create extension if not exists pgcrypto; -- for gen_random_uuid()
create extension if not exists vector;   -- for pgvector

-- 2) Tables

-- 2.1) Users (application profile) mapped 1:1 to auth.users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid() references auth.users (id) on delete cascade,
  email text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute procedure public.set_updated_at();

-- Auto-provision profile on auth signups
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 2.2) Gadgets
create table if not exists public.gadgets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  price numeric(12,2),
  image_url text,
  product_url text,
  description text,
  created_at timestamptz not null default now()
);

-- 2.3) Specs (normalized key/value)
create table if not exists public.specs_normalized (
  id uuid primary key default gen_random_uuid(),
  gadget_id uuid not null references public.gadgets (id) on delete cascade,
  key text not null,
  value text not null,
  numeric_value numeric,
  units text,
  created_at timestamptz not null default now()
);

-- 2.4) Benchmarks
create table if not exists public.benchmarks (
  id uuid primary key default gen_random_uuid(),
  gadget_id uuid not null references public.gadgets (id) on delete cascade,
  suite text not null,       -- e.g., Geekbench, Cinebench
  metric text not null,      -- e.g., single_core, multi_core
  score numeric not null,
  source_url text,
  context_json jsonb,
  created_at timestamptz not null default now()
);

-- 2.5) Reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  gadget_id uuid not null references public.gadgets (id) on delete cascade,
  source text,              -- e.g., Reddit, Amazon, YouTube
  author text,
  url text,
  rating numeric,
  content text not null,
  created_at timestamptz not null default now()
);

-- 2.6) Embeddings (vector store)
-- Using a generic pointer via (item_type, item_id) for flexibility
create table if not exists public.embeddings (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (item_type in ('gadget','review','benchmark','spec')),
  item_id uuid not null,
  vector vector(1536) not null,
  created_at timestamptz not null default now(),
  unique (item_type, item_id)
);

-- 2.7) Recommendations (LLM outputs)
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  query text not null,
  model text,
  response_json jsonb,
  created_at timestamptz not null default now()
);

-- 2.8) Feedback on recommendations
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  recommendation_id uuid not null references public.recommendations (id) on delete cascade,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- 3) Indexes

-- Gadgets quick lookups
create index if not exists gadgets_name_idx on public.gadgets (name);
create index if not exists gadgets_brand_idx on public.gadgets (brand);
create index if not exists gadgets_price_idx on public.gadgets (price);

-- Reviews FTS
create index if not exists reviews_content_fts_idx
  on public.reviews using gin (to_tsvector('english', coalesce(content, '')));

-- Specs FTS
create index if not exists specs_value_fts_idx
  on public.specs_normalized using gin (to_tsvector('english', coalesce(value, '')));

-- Embeddings vector index (IVFFLAT with L2 distance)
-- Note: Creating IVFFLAT before data is fine; for best performance, set after initial bulk load.
do $$ begin
  perform 1 from pg_indexes where schemaname = 'public' and indexname = 'embeddings_vector_ivfflat_idx';
  if not found then
    execute 'create index embeddings_vector_ivfflat_idx on public.embeddings using ivfflat (vector vector_l2_ops) with (lists = 100)';
  end if;
end $$;

-- Helpful composite index for pointer resolution
create index if not exists embeddings_item_lookup_idx on public.embeddings (item_type, item_id);

-- 4) Row Level Security (RLS) and Policies

-- Enable RLS
alter table public.users            enable row level security;
alter table public.gadgets          enable row level security;
alter table public.reviews          enable row level security;
alter table public.specs_normalized enable row level security;
alter table public.benchmarks       enable row level security;
alter table public.embeddings       enable row level security;
alter table public.recommendations  enable row level security;
alter table public.feedback         enable row level security;

-- Public read for non-sensitive content
drop policy if exists "Public read gadgets" on public.gadgets;
create policy "Public read gadgets" on public.gadgets
  for select using (true);

drop policy if exists "Public read reviews" on public.reviews;
create policy "Public read reviews" on public.reviews
  for select using (true);

drop policy if exists "Public read specs" on public.specs_normalized;
create policy "Public read specs" on public.specs_normalized
  for select using (true);

drop policy if exists "Public read benchmarks" on public.benchmarks;
create policy "Public read benchmarks" on public.benchmarks
  for select using (true);

-- No public access to embeddings (service key should be used server-side)
-- Leave with RLS enabled and no policies => denied for anon/auth roles

-- Users: each authenticated user can see/update their own row
drop policy if exists "Users select own" on public.users;
create policy "Users select own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "Users insert own" on public.users;
create policy "Users insert own" on public.users
  for insert with check (auth.uid() = id);

drop policy if exists "Users update own" on public.users;
create policy "Users update own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Recommendations: owner-only access
drop policy if exists "Recommendations select own" on public.recommendations;
create policy "Recommendations select own" on public.recommendations
  for select using (auth.uid() = user_id);

drop policy if exists "Recommendations insert own" on public.recommendations;
create policy "Recommendations insert own" on public.recommendations
  for insert with check (auth.uid() = user_id);

drop policy if exists "Recommendations update own" on public.recommendations;
create policy "Recommendations update own" on public.recommendations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Recommendations delete own" on public.recommendations;
create policy "Recommendations delete own" on public.recommendations
  for delete using (auth.uid() = user_id);

-- Feedback: owner-only access
drop policy if exists "Feedback select own" on public.feedback;
create policy "Feedback select own" on public.feedback
  for select using (auth.uid() = user_id);

drop policy if exists "Feedback insert own" on public.feedback;
create policy "Feedback insert own" on public.feedback
  for insert with check (auth.uid() = user_id);

drop policy if exists "Feedback update own" on public.feedback;
create policy "Feedback update own" on public.feedback
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Feedback delete own" on public.feedback;
create policy "Feedback delete own" on public.feedback
  for delete using (auth.uid() = user_id);

-- 5) Grants (optional; Supabase manages roles, but keep explicit reads for clarity)
-- By default, anon/auth roles will be governed by RLS. No additional grants are required here.

-- 6) Comments (docs)
comment on table public.embeddings is 'Vector store for gadgets/reviews/benchmarks/specs. Access via service role only.';
comment on column public.embeddings.vector is '1536-dim vectors (e.g., OpenAI text-embedding-3-small)';

