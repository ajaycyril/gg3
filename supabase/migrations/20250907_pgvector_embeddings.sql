-- Enable required extensions
create extension if not exists vector;
create extension if not exists pg_trgm;

-- Embeddings table (optional for future use)
create table if not exists public.gadget_embeddings (
  gadget_id uuid primary key references public.gadgets(id) on delete cascade,
  embedding vector(1536),
  updated_at timestamp with time zone default now()
);

-- Optional index for fast ANN search (requires populated embeddings)
do $$ begin
  execute 'create index if not exists gadget_embeddings_embedding_idx on public.gadget_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100)';
exception when others then null; -- IVFFLAT may fail if not supported
end $$;

-- RPC: match_gadgets using text similarity (fallback if embeddings unavailable)
-- Returns up to match_count rows filtered by price/brand, ordered by relevance
create or replace function public.match_gadgets(
  query_text text,
  match_count integer default 50,
  price_min numeric default 100,
  price_max numeric default 100000,
  brand_filter text default null
)
returns table (
  id uuid,
  name text,
  brand text,
  price numeric,
  image_url text,
  link text,
  specs jsonb,
  created_at timestamp with time zone,
  score double precision
) language sql stable as $$
  with base as (
    select g.*, 
      setweight(to_tsvector('simple', coalesce(g.name,'')), 'A') ||
      setweight(to_tsvector('simple', coalesce(g.brand,'')), 'B') ||
      setweight(to_tsvector('simple', left(coalesce(g.specs::text,''), 1000)), 'C') as doc
    from public.gadgets g
    where (g.price is null or (g.price >= price_min and g.price <= price_max))
      and (brand_filter is null or g.brand ilike any (string_to_array(brand_filter, ',') ))
  )
  select b.id, b.name, b.brand, b.price, b.image_url, b.link, b.specs, b.created_at,
         greatest(0.0, ts_rank(b.doc, plainto_tsquery('simple', coalesce(query_text,'')))) as score
  from base b
  order by score desc, coalesce(b.price, 0) asc
  limit greatest(1, match_count);
$$;

comment on function public.match_gadgets is 'Fallback text-similarity gadget matcher with price/brand constraints. Replace with pgvector similarity when embeddings are available.';

