-- GadgetGuru v1 – Core Database Schema (Supabase/Postgres)
-- Extensions, tables, indexes, RLS, and policies

-- Init schema for GadgetGuru (Base tables first, pgvector later)
-- This migration creates the core tables without pgvector dependency
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN duplicate_object THEN
  -- ignore
END $$;

-- Tables (without vector column initially)
CREATE TABLE IF NOT EXISTS gadgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  price numeric,
  image_url text,
  link text,
  specs jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gadget_id uuid REFERENCES gadgets(id) ON DELETE CASCADE,
  content text NOT NULL,
  author text,
  source text,
  rating smallint,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS specs_normalized (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gadget_id uuid REFERENCES gadgets(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gadget_id uuid REFERENCES gadgets(id) ON DELETE CASCADE,
  context_json jsonb,
  score numeric,
  created_at timestamptz DEFAULT now()
);

-- Embeddings table placeholder (will add vector column after pgvector is enabled)
CREATE TABLE IF NOT EXISTS embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,        -- e.g. 'reviews', 'specs_normalized', 'benchmarks'
  source_id uuid NOT NULL,          -- reference id in source_table
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE,              -- set to auth.uid() from backend when creating profile
  display_name text,
  email text,
  preferences jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  gadget_id uuid,
  prompt text,
  result jsonb,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recommendation_id uuid REFERENCES recommendations(id) ON DELETE CASCADE,
  text text,
  rating smallint,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS gadgets_name_idx ON gadgets USING btree (lower(name));
CREATE INDEX IF NOT EXISTS gadgets_brand_idx ON gadgets USING btree (lower(brand));

-- Full text indexes for search
CREATE INDEX IF NOT EXISTS reviews_content_fts_idx ON reviews USING gin (to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS specs_value_fts_idx ON specs_normalized USING gin (to_tsvector('english', value));

-- RLS setup: enable RLS and create policies
-- Public-read tables
ALTER TABLE IF EXISTS gadgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_gadgets" ON gadgets;
CREATE POLICY "public_read_gadgets" ON gadgets FOR SELECT USING (true);

ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_reviews" ON reviews;
CREATE POLICY "public_read_reviews" ON reviews FOR SELECT USING (true);

ALTER TABLE IF EXISTS specs_normalized ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_specs" ON specs_normalized;
CREATE POLICY "public_read_specs" ON specs_normalized FOR SELECT USING (true);

ALTER TABLE IF EXISTS benchmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_benchmarks" ON benchmarks;
CREATE POLICY "public_read_benchmarks" ON benchmarks FOR SELECT USING (true);

-- Embeddings: restrict write (only server/service role), allow select only to service role or server functions.
ALTER TABLE IF EXISTS embeddings ENABLE ROW LEVEL SECURITY;
-- No public select by default; allow service role via function or bypass with service key.

-- Users table RLS: users can read public profiles, update their own profile (match auth_id)
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_users" ON users;
CREATE POLICY "public_read_users" ON users FOR SELECT USING (true);
DROP POLICY IF EXISTS "users_update_self" ON users;
CREATE POLICY "users_update_self" ON users FOR UPDATE USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());
DROP POLICY IF EXISTS "users_insert_self" ON users;
CREATE POLICY "users_insert_self" ON users FOR INSERT WITH CHECK (auth_id = auth.uid());

-- Recommendations: only owner can read/write
ALTER TABLE IF EXISTS recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recommendations_owner_select" ON recommendations;
CREATE POLICY "recommendations_owner_select" ON recommendations FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "recommendations_owner_insert" ON recommendations;
CREATE POLICY "recommendations_owner_insert" ON recommendations FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "recommendations_owner_update" ON recommendations;
CREATE POLICY "recommendations_owner_update" ON recommendations FOR UPDATE USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid())) WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "recommendations_owner_delete" ON recommendations;
CREATE POLICY "recommendations_owner_delete" ON recommendations FOR DELETE USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Feedback: only owner can manage their feedback
ALTER TABLE IF EXISTS feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feedback_owner_select" ON feedback;
CREATE POLICY "feedback_owner_select" ON feedback FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "feedback_owner_insert" ON feedback;
CREATE POLICY "feedback_owner_insert" ON feedback FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "feedback_owner_update" ON feedback;
CREATE POLICY "feedback_owner_update" ON feedback FOR UPDATE USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid())) WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));
DROP POLICY IF EXISTS "feedback_owner_delete" ON feedback;
CREATE POLICY "feedback_owner_delete" ON feedback FOR DELETE USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Ensure privileges to authenticated role (Supabase default 'authenticated')
REVOKE ALL ON gadgets, reviews, specs_normalized, benchmarks FROM public;
GRANT SELECT ON gadgets, reviews, specs_normalized, benchmarks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON recommendations, feedback, users TO authenticated;

-- Comments (docs)
COMMENT ON TABLE public.embeddings IS 'Vector store for gadgets/reviews/benchmarks/specs. Access via service role only. Vector column will be added after pgvector extension is enabled.';
COMMENT ON TABLE public.gadgets IS 'Core gadgets catalog with specs, pricing, and metadata.';
COMMENT ON TABLE public.reviews IS 'User and expert reviews from various sources (Reddit, YouTube, Amazon, etc.).';

