-- GadgetGuru v1 – Production Database Schema (Supabase/Postgres)
-- Initial migration for new project

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create tables first
CREATE TABLE IF NOT EXISTS gadgets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  brand text,
  price numeric,
  image_url text,
  link text,
  specs jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gadget_id uuid REFERENCES gadgets(id) ON DELETE CASCADE,
  content text NOT NULL,
  author text,
  source text,
  rating smallint,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS specs_normalized (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gadget_id uuid REFERENCES gadgets(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS benchmarks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gadget_id uuid REFERENCES gadgets(id) ON DELETE CASCADE,
  context_json jsonb,
  score numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id uuid UNIQUE,
  display_name text,
  email text,
  preferences jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gadget_id uuid REFERENCES gadgets(id) ON DELETE SET NULL,
  prompt text,
  result jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recommendation_id uuid REFERENCES recommendations(id) ON DELETE CASCADE,
  text text,
  rating smallint,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS gadgets_name_idx ON gadgets USING btree (lower(name));
CREATE INDEX IF NOT EXISTS gadgets_brand_idx ON gadgets USING btree (lower(brand));
CREATE INDEX IF NOT EXISTS reviews_gadget_id_idx ON reviews (gadget_id);
CREATE INDEX IF NOT EXISTS specs_gadget_id_idx ON specs_normalized (gadget_id);
CREATE INDEX IF NOT EXISTS benchmarks_gadget_id_idx ON benchmarks (gadget_id);

-- Full text search indexes
CREATE INDEX IF NOT EXISTS reviews_content_fts_idx ON reviews USING gin (to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS specs_value_fts_idx ON specs_normalized USING gin (to_tsvector('english', value));

-- Enable Row Level Security
ALTER TABLE gadgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE specs_normalized ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read on gadgets" ON gadgets;
DROP POLICY IF EXISTS "Allow public read on reviews" ON reviews;
DROP POLICY IF EXISTS "Allow public read on specs" ON specs_normalized;
DROP POLICY IF EXISTS "Allow public read on benchmarks" ON benchmarks;
DROP POLICY IF EXISTS "Users can read public profiles" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can read own recommendations" ON recommendations;
DROP POLICY IF EXISTS "Users can insert own recommendations" ON recommendations;
DROP POLICY IF EXISTS "Users can update own recommendations" ON recommendations;
DROP POLICY IF EXISTS "Users can delete own recommendations" ON recommendations;
DROP POLICY IF EXISTS "Users can read own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can update own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can delete own feedback" ON feedback;

-- Public read access for catalog data
CREATE POLICY "Allow public read on gadgets" ON gadgets FOR SELECT USING (true);
CREATE POLICY "Allow public read on reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Allow public read on specs" ON specs_normalized FOR SELECT USING (true);
CREATE POLICY "Allow public read on benchmarks" ON benchmarks FOR SELECT USING (true);

-- User data policies
CREATE POLICY "Users can read public profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = auth_id::text);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = auth_id::text);

-- Recommendations policies
CREATE POLICY "Users can read own recommendations" ON recommendations FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own recommendations" ON recommendations FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own recommendations" ON recommendations FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own recommendations" ON recommendations FOR DELETE USING (auth.uid()::text = user_id::text);

-- Feedback policies
CREATE POLICY "Users can read own feedback" ON feedback FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own feedback" ON feedback FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own feedback" ON feedback FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own feedback" ON feedback FOR DELETE USING (auth.uid()::text = user_id::text);