-- Comprehensive AI-ready schema: variants, components, specs, benchmarks,
-- scraping pipeline, reviews + aspects, embeddings, aliases, and search RPCs.
-- Designed to coexist with existing tables (gadgets, reviews, specs_normalized, benchmarks).

create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pg_trgm;

-- =============================
-- Catalog: Variants and Releases
-- =============================

create table if not exists gadget_variants (
  id uuid primary key default gen_random_uuid(),
  gadget_id uuid references gadgets(id) on delete cascade,
  sku text,
  variant_name text,
  year int,
  region text,
  release_date date,
  eol_date date,
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_gadget_variants_gadget_year on gadget_variants (gadget_id, year);
create index if not exists idx_gadget_variants_dedupe on gadget_variants using gin (dedupe_key gin_trgm_ops);
-- Unique identity across optional fields via expression index
create unique index if not exists uq_gadget_variants_identity on gadget_variants 
  (gadget_id, coalesce(sku, ''), coalesce(variant_name, ''), coalesce(year::text, ''));

create table if not exists releases (
  id uuid primary key default gen_random_uuid(),
  gadget_id uuid references gadgets(id) on delete cascade,
  year int,
  quarter int check (quarter between 1 and 4),
  release_notes text,
  changelog jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =============================
-- Components and Linking
-- =============================

create table if not exists components (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('cpu','gpu','ram','storage','display','battery','wifi','port','cooling','other')),
  vendor text,
  model text,
  generation text,
  family text,
  key_specs jsonb default '{}'::jsonb,
  aliases text[] default '{}',
  created_at timestamptz not null default now(),
  unique (type, coalesce(vendor,''), coalesce(model,''))
);
create index if not exists idx_components_type_vendor_model on components (type, vendor, model);
create index if not exists idx_components_keyspecs on components using gin (key_specs);

create table if not exists gadget_variant_components (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references gadget_variants(id) on delete cascade,
  component_id uuid references components(id) on delete cascade,
  position int,
  quantity int,
  overrides jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (variant_id, component_id)
);
create index if not exists idx_gvc_variant on gadget_variant_components (variant_id);

-- =============================
-- Two-layered Specs
-- =============================

create table if not exists gadget_spec_groups (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references gadget_variants(id) on delete cascade,
  group_name text not null,
  group_order int default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_spec_groups_variant on gadget_spec_groups (variant_id);

create table if not exists gadget_specs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references gadget_spec_groups(id) on delete cascade,
  spec_key text not null,
  spec_value_text text,
  spec_value_numeric numeric,
  unit text,
  source text,
  confidence numeric(3,2) default 0.8,
  created_at timestamptz not null default now()
);
create index if not exists idx_specs_group on gadget_specs (group_id);
create index if not exists idx_specs_key on gadget_specs (spec_key);
create index if not exists idx_specs_value_text_gin on gadget_specs using gin (spec_value_text gin_trgm_ops);

-- =============================
-- Benchmarks
-- =============================

create table if not exists component_benchmarks (
  id uuid primary key default gen_random_uuid(),
  component_id uuid references components(id) on delete cascade,
  suite text not null,
  metric text not null,
  score numeric,
  normalized_score numeric,
  source text,
  run_date date,
  created_at timestamptz not null default now(),
  unique (component_id, suite, metric, coalesce(run_date, 'epoch'::date))
);
create index if not exists idx_component_benchmarks_suite on component_benchmarks (component_id, suite);

create table if not exists gadget_benchmarks (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references gadget_variants(id) on delete cascade,
  suite text not null,
  metric text not null,
  score numeric,
  normalized_score numeric,
  source text,
  run_date date,
  created_at timestamptz not null default now()
);
create index if not exists idx_gadget_benchmarks_variant_suite on gadget_benchmarks (variant_id, suite);

-- =============================
-- Scraping Pipeline
-- =============================

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('expert_site','retailer','forum','youtube','reddit','other')),
  base_url text,
  robots_info jsonb default '{}'::jsonb,
  credibility_score numeric(3,2),
  created_at timestamptz not null default now()
);

create table if not exists scraping_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','succeeded','failed','partial')),
  stats jsonb default '{}'::jsonb
);
create index if not exists idx_scraping_runs_source_time on scraping_runs (source_id, started_at desc);

create table if not exists raw_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete cascade,
  scraping_run_id uuid references scraping_runs(id) on delete set null,
  url text,
  content_type text,
  raw_text text,
  html_hash text,
  fetched_at timestamptz,
  language text,
  metadata jsonb default '{}'::jsonb
);
create index if not exists idx_raw_documents_source_time on raw_documents (source_id, fetched_at desc);
create index if not exists idx_raw_documents_url on raw_documents using gin (url gin_trgm_ops);

create table if not exists parsed_documents (
  id uuid primary key default gen_random_uuid(),
  raw_document_id uuid references raw_documents(id) on delete cascade,
  doc_type text check (doc_type in ('expert_review','user_review','spec_sheet','product_page','news','other')),
  title text,
  author text,
  published_at timestamptz,
  parsed_text text,
  structured jsonb default '{}'::jsonb,
  quality_score numeric(3,2),
  created_at timestamptz not null default now()
);
create index if not exists idx_parsed_documents_type_time on parsed_documents (doc_type, published_at desc);

create table if not exists extraction_errors (
  id uuid primary key default gen_random_uuid(),
  raw_document_id uuid references raw_documents(id) on delete cascade,
  stage text,
  error_message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- =============================
-- Reviews, Chunks, Aspects
-- =============================

-- Keep existing reviews table; add chunking/aspects around it.
create table if not exists review_chunks (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references reviews(id) on delete cascade,
  chunk_index int not null,
  text_chunk text not null,
  token_count int,
  created_at timestamptz not null default now(),
  unique (review_id, chunk_index)
);
create index if not exists idx_review_chunks_review on review_chunks (review_id);

create table if not exists aspects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  parent_id uuid references aspects(id) on delete set null,
  display_name text not null,
  synonyms text[] default '{}'
);

create table if not exists aspect_opinions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references reviews(id) on delete cascade,
  chunk_id uuid references review_chunks(id) on delete set null,
  aspect_id uuid references aspects(id) on delete cascade,
  sentiment numeric(3,2) not null, -- -1..1
  evidence_span text,
  confidence numeric(3,2) default 0.7,
  created_at timestamptz not null default now()
);
create index if not exists idx_aspect_opinions_review on aspect_opinions (review_id);
create index if not exists idx_aspect_opinions_aspect on aspect_opinions (aspect_id);

-- =============================
-- Aliases and Normalization Rules
-- =============================

create table if not exists brand_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text unique not null,
  canonical_brand text not null
);

create table if not exists model_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text unique not null,
  canonical_model_family text not null,
  rules jsonb default '{}'::jsonb
);
create index if not exists idx_model_aliases_alias_trgm on model_aliases using gin (alias gin_trgm_ops);

create table if not exists component_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text unique not null,
  canonical text not null,
  type text
);

create table if not exists sku_normalization_rules (
  id uuid primary key default gen_random_uuid(),
  vendor text,
  pattern text,
  rules jsonb
);

-- =============================
-- Embeddings & Hybrid Search
-- =============================

create table if not exists content_embeddings (
  id uuid primary key default gen_random_uuid(),
  ref_type text not null check (ref_type in ('review_chunk','spec','product_page','benchmark')),
  ref_id uuid not null,
  source_id uuid references sources(id) on delete set null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_content_embeddings_ref on content_embeddings (ref_type, ref_id);
-- IVFFlat index (requires ANALYZE after bulk load for best performance)
create index if not exists idx_content_embeddings_ivfflat on content_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Simple semantic index view per gadget (average embeddings from review chunks)
create or replace view v_gadget_semantic_index as
select r.gadget_id, avg(ce.embedding) as combined_embedding
from reviews r
join review_chunks rc on rc.review_id = r.id
join content_embeddings ce on ce.ref_type = 'review_chunk' and ce.ref_id = rc.id
group by r.gadget_id;

-- RPC: match embeddings
create or replace function match_embeddings(
  query_embedding vector(1536),
  match_count int default 10,
  match_threshold float default 0.5
)
returns table (
  ref_type text,
  ref_id uuid,
  similarity float
) language plpgsql as $$
begin
  return query
  select ce.ref_type, ce.ref_id, 1 - (ce.embedding <=> query_embedding) as similarity
  from content_embeddings ce
  where 1 - (ce.embedding <=> query_embedding) >= match_threshold
  order by ce.embedding <=> query_embedding
  limit greatest(match_count, 1);
end;
$$;

-- =============================
-- Matching provenance
-- =============================

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  raw_document_id uuid references raw_documents(id) on delete cascade,
  parsed_document_id uuid references parsed_documents(id) on delete set null,
  gadget_id uuid references gadgets(id) on delete set null,
  variant_id uuid references gadget_variants(id) on delete set null,
  method text not null, -- deterministic, embedding, hybrid, manual
  score numeric(4,3),
  reviewer text,
  reviewed_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);
create index if not exists idx_matches_doc on matches (raw_document_id);

-- =============================
-- Views for search cards and scores (non-MV for portability)
-- =============================

create or replace view v_gadget_search as
select
  gv.id as variant_id,
  g.id as gadget_id,
  g.brand,
  g.name as model,
  gv.variant_name,
  gv.year,
  (select avg(r.rating) from reviews r where r.gadget_id = g.id) as avg_rating,
  (select count(*) from reviews r where r.gadget_id = g.id) as review_count
from gadgets g
left join gadget_variants gv on gv.gadget_id = g.id;

create or replace view v_gadget_scores as
select
  gv.id as variant_id,
  coalesce((select avg(normalized_score) from gadget_benchmarks gb where gb.variant_id = gv.id), 0) * 0.6
    + coalesce((select avg(r.rating)/5.0 from reviews r where r.gadget_id = gv.gadget_id), 0) * 0.3
    + (case when gv.year is not null and gv.year >= extract(year from now())::int - 1 then 0.1 else 0 end) as overall_score
from gadget_variants gv;

-- =============================
-- RLS toggles (enable and leave policy definition to app level)
-- =============================
alter table review_chunks enable row level security;
alter table aspect_opinions enable row level security;
alter table content_embeddings enable row level security;
alter table matches enable row level security;

-- =============================
-- Done
-- =============================
