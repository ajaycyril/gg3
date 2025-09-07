-- Monetization, subscriptions, usage quotas, third‑party imports, and recommendation entities
-- This migration only adds new tables and indexes; it does not modify existing ones.

-- Use extensions if not already enabled
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- =============================
-- Monetization: Affiliates
-- =============================

create table if not exists affiliate_networks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text,
  contact_email text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists affiliate_merchants (
  id uuid primary key default gen_random_uuid(),
  network_id uuid references affiliate_networks(id) on delete set null,
  name text not null,
  domain text,
  currency text default 'USD',
  default_commission_rate numeric(6,3),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (network_id, name)
);

-- Store affiliate links at variant granularity
create table if not exists affiliate_links (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references affiliate_merchants(id) on delete cascade,
  variant_id uuid references gadget_variants(id) on delete cascade,
  url text not null,
  tracking_id text,
  affiliate_params jsonb default '{}'::jsonb,
  commission_rate numeric(6,3),
  status text default 'active' check (status in ('active','paused','expired')),
  last_checked_at timestamptz,
  click_count bigint default 0,
  conversion_count bigint default 0,
  created_at timestamptz not null default now(),
  unique (merchant_id, variant_id)
);

-- Clicks and conversions for attribution
create table if not exists affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid references affiliate_links(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  ip inet,
  user_agent text,
  referrer text,
  session_id text,
  tenant_id uuid,
  metadata jsonb default '{}'::jsonb
);
create index if not exists idx_affiliate_clicks_link_time on affiliate_clicks (link_id, occurred_at desc);

create table if not exists affiliate_conversions (
  id uuid primary key default gen_random_uuid(),
  link_id uuid references affiliate_links(id) on delete cascade,
  click_id uuid references affiliate_clicks(id) on delete set null,
  occurred_at timestamptz not null default now(),
  order_id text,
  revenue numeric(12,2),
  commission numeric(12,2),
  currency text default 'USD',
  metadata jsonb default '{}'::jsonb
);
create index if not exists idx_affiliate_conversions_link_time on affiliate_conversions (link_id, occurred_at desc);

-- =============================
-- Subscriptions, Plans, Quotas
-- =============================

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  price_monthly numeric(10,2) default 0,
  currency text default 'USD',
  features jsonb default '{}'::jsonb,
  limits jsonb default '{}'::jsonb, -- e.g., { ai_messages: 1000, api_requests: 50000 }
  created_at timestamptz not null default now()
);

-- Assumes tenants table exists; if not, create a lightweight one
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  plan_id uuid references plans(id) on delete restrict,
  status text not null default 'active' check (status in ('active','past_due','canceled')),
  started_at timestamptz not null default now(),
  current_period_start timestamptz not null default date_trunc('month', now()),
  current_period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  metadata jsonb default '{}'::jsonb,
  unique (tenant_id, status) where (status = 'active')
);
create index if not exists idx_tenant_subscriptions_period on tenant_subscriptions (tenant_id, current_period_end desc);

-- Usage counters for quotas and rate enforcement
create table if not exists usage_counters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  period_start date not null default date_trunc('month', now())::date,
  metric text not null, -- e.g., ai_messages, api_requests, embeddings, recommendations
  count bigint not null default 0,
  hard_limit bigint,
  soft_limit bigint,
  updated_at timestamptz not null default now(),
  unique (tenant_id, period_start, metric)
);
create index if not exists idx_usage_counters_lookup on usage_counters (tenant_id, metric);

-- Detailed usage events (optional but helpful for analytics and audits)
create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  user_id uuid,
  occurred_at timestamptz not null default now(),
  metric text not null, -- same namespace as usage_counters.metric
  quantity bigint not null default 1,
  metadata jsonb default '{}'::jsonb
);
create index if not exists idx_usage_events_tenant_time on usage_events (tenant_id, occurred_at desc);

-- =============================
-- Recommendations Entities
-- =============================

-- A logical group of recommendations produced together (per query/session/campaign)
create table if not exists recommendation_sets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null,
  user_id uuid,
  source text not null default 'ml' check (source in ('ml','ai','editorial','hybrid')),
  context jsonb default '{}'::jsonb,
  query text,
  created_at timestamptz not null default now()
);

create table if not exists recommended_gadgets (
  id uuid primary key default gen_random_uuid(),
  set_id uuid references recommendation_sets(id) on delete cascade,
  variant_id uuid references gadget_variants(id) on delete cascade,
  score numeric(6,3) not null,
  rank int not null,
  reason text,
  explanation jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (set_id, variant_id)
);
create index if not exists idx_recommended_gadgets_set_rank on recommended_gadgets (set_id, rank);

-- =============================
-- Third‑party Data Imports
-- =============================

create table if not exists data_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  contact text,
  license text, -- e.g., CC BY, commercial license id
  terms_url text,
  reliability_score numeric(3,2),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists provider_datasets (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references data_providers(id) on delete cascade,
  name text not null,
  version text,
  description text,
  schema_notes text,
  import_strategy text default 'upsert',
  created_at timestamptz not null default now(),
  unique (provider_id, name, coalesce(version, ''))
);

create table if not exists import_runs (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references provider_datasets(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','succeeded','failed','partial')),
  inserted_count bigint default 0,
  updated_count bigint default 0,
  error_count bigint default 0,
  log jsonb default '{}'::jsonb
);
create index if not exists idx_import_runs_dataset_time on import_runs (dataset_id, started_at desc);

-- Optional mapping registry to track field transformations
create table if not exists import_mappings (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references provider_datasets(id) on delete cascade,
  source_field text not null,
  target_table text not null,
  target_field text not null,
  transform text, -- name of transform or expression notes
  notes text
);

-- =============================
-- Helper views & minimal policies (adjust per project RLS strategy)
-- =============================

-- Denormalized view for affiliate offers per variant
create or replace view v_variant_offers as
select
  al.id as affiliate_link_id,
  gv.id as variant_id,
  gm.name as merchant_name,
  al.url,
  coalesce(al.commission_rate, gm.default_commission_rate) as commission_rate,
  al.status,
  al.click_count,
  al.conversion_count,
  al.last_checked_at
from affiliate_links al
join gadget_variants gv on gv.id = al.variant_id
join affiliate_merchants gm on gm.id = al.merchant_id;

-- Basic indexes improving typical filters
create index if not exists idx_affiliate_links_variant on affiliate_links (variant_id);
create index if not exists idx_affiliate_links_status on affiliate_links (status);

-- Minimal RLS (customize to your needs)
-- Enable RLS only on sensitive tables;
alter table affiliate_clicks enable row level security;
alter table affiliate_conversions enable row level security;
alter table usage_counters enable row level security;
alter table usage_events enable row level security;
alter table recommendation_sets enable row level security;
alter table recommended_gadgets enable row level security;

-- Public read for v_variant_offers (view) can be controlled via underlying tables' policies or by moving view to a dedicated schema.

-- Example permissive policies (replace with tenant-aware ones in prod)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'recommendation_sets' and policyname = 'allow_read_recommendation_sets') then
    create policy allow_read_recommendation_sets on recommendation_sets for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'recommended_gadgets' and policyname = 'allow_read_recommended_gadgets') then
    create policy allow_read_recommended_gadgets on recommended_gadgets for select using (true);
  end if;
end $$;

-- =============================
-- Utility function: increment usage counter
-- =============================

create or replace function increment_usage(
  p_tenant uuid,
  p_metric text,
  p_qty bigint default 1
) returns void language plpgsql as $$
declare
  v_period date := date_trunc('month', now())::date;
begin
  insert into usage_counters (tenant_id, period_start, metric, count, updated_at)
  values (p_tenant, v_period, p_metric, p_qty, now())
  on conflict (tenant_id, period_start, metric)
  do update set count = usage_counters.count + excluded.count, updated_at = now();
end;
$$;

-- =============================
-- Done
-- =============================

