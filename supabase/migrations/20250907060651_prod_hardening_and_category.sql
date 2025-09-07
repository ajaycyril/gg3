-- Prod hardening: add category and performance indexes
create extension if not exists pg_trgm;

-- Add category column if missing
do $$ begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='gadgets' and column_name='category'
  ) then
    alter table gadgets add column category text;
  end if;
end $$;

-- Backfill category with simple heuristics (idempotent and safe)
update gadgets set category = 'laptop'
where (coalesce(category,'') = '' or category is null)
  and (
    lower(name) like '%laptop%' or lower(name) like '%macbook%' or lower(name) like '%thinkpad%' or lower(name) like '%surface%'
  );

update gadgets set category = 'phone'
where (coalesce(category,'') = '' or category is null)
  and (
    lower(name) like '%iphone%' or lower(name) like 'galaxy s%'
  );

update gadgets set category = 'console'
where (coalesce(category,'') = '' or category is null)
  and (
    lower(name) like '%steam deck%' or lower(name) like '%switch%'
  );

update gadgets set category = 'accessory'
where (coalesce(category,'') = '' or category is null)
  and (
    lower(name) like '%airpods%'
  );

-- Indexes to accelerate ilike/or filters
create index if not exists idx_gadgets_name_trgm on gadgets using gin (name gin_trgm_ops);
create index if not exists idx_gadgets_brand_trgm on gadgets using gin (brand gin_trgm_ops);
create index if not exists idx_gadgets_category on gadgets (category);
