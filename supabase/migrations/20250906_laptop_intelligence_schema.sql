-- GadgetGuru Enhanced Schema for Comprehensive Laptop Intelligence Platform
-- Supporting multi-source data ingestion, AI-powered recommendations, and third-party integrations

-- Enhanced laptops table with comprehensive specifications
CREATE TABLE IF NOT EXISTS laptops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  variant VARCHAR(100), -- For different configurations of same model
  sku VARCHAR(100), -- Manufacturer SKU
  
  -- Pricing and Availability
  price_usd DECIMAL(10,2),
  price_local DECIMAL(10,2),
  currency_code VARCHAR(3) DEFAULT 'USD',
  availability_status VARCHAR(50) DEFAULT 'unknown', -- available, discontinued, out_of_stock
  local_availability JSONB, -- Store-wise availability data
  
  -- Release Information
  release_date DATE,
  generation VARCHAR(50), -- e.g., "13th Gen", "M3", "Ryzen 7000"
  is_latest_gen BOOLEAN DEFAULT false,
  
  -- Core Specifications (Structured)
  processor JSONB NOT NULL, -- {brand, model, cores, threads, base_clock, boost_clock, architecture, tdp}
  memory JSONB NOT NULL, -- {capacity_gb, type, speed, upgradeable, max_capacity}
  storage JSONB NOT NULL, -- {type, capacity_gb, interface, additional_slots}
  display JSONB NOT NULL, -- {size_inches, resolution, refresh_rate, panel_type, brightness_nits, color_gamut}
  graphics JSONB NOT NULL, -- {integrated, dedicated, vram_gb, model}
  
  -- Physical Attributes
  dimensions JSONB, -- {length_mm, width_mm, thickness_mm, weight_g}
  build_quality JSONB, -- {materials, durability_rating, certifications}
  
  -- Connectivity & Ports
  connectivity JSONB, -- {wifi_standard, bluetooth_version, ethernet, cellular}
  ports JSONB, -- Array of available ports
  
  -- Battery & Power
  battery JSONB, -- {capacity_wh, estimated_life_hours, charging_speed}
  power_adapter JSONB, -- {wattage, type, weight}
  
  -- Performance Benchmarks (Aggregated)
  performance_scores JSONB, -- {cpu_score, gpu_score, overall_score, gaming_score}
  benchmark_results JSONB, -- Detailed benchmark results
  
  -- User Experience Metrics
  rating_overall DECIMAL(3,2), -- Aggregated rating from all sources
  rating_performance DECIMAL(3,2),
  rating_build_quality DECIMAL(3,2),
  rating_value DECIMAL(3,2),
  rating_battery DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  sentiment_score DECIMAL(3,2), -- AI-analyzed sentiment from reviews
  
  -- Common Issues (AI-extracted from reviews)
  common_issues JSONB, -- {overheating: count, battery_life: count, etc.}
  pros JSONB, -- Array of commonly mentioned positives
  cons JSONB, -- Array of commonly mentioned negatives
  
  -- Target Audience Classification
  use_cases JSONB, -- {gaming, professional, student, casual, creative}
  skill_level_match JSONB, -- {beginner: score, intermediate: score, expert: score}
  
  -- AI and Vector Data
  embedding_vector VECTOR(1536), -- OpenAI embeddings for similarity search
  features_embedding VECTOR(768), -- Compressed feature representation
  
  -- Metadata
  data_sources JSONB, -- Track where data came from
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_quality_score DECIMAL(3,2), -- Confidence in data accuracy
  verification_status VARCHAR(50) DEFAULT 'pending', -- verified, pending, flagged
  
  -- Indexes for performance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced reviews table for multi-source review aggregation
CREATE TABLE IF NOT EXISTS laptop_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laptop_id UUID REFERENCES laptops(id) ON DELETE CASCADE,
  
  -- Source Information
  source_platform VARCHAR(50) NOT NULL, -- reddit, youtube, amazon, expert_review
  source_url TEXT,
  source_id VARCHAR(255), -- Platform-specific ID
  
  -- Review Content
  title TEXT,
  content TEXT NOT NULL,
  author_name VARCHAR(255),
  author_verified BOOLEAN DEFAULT false,
  
  -- Ratings (1-5 scale, normalized)
  rating_overall DECIMAL(3,2),
  rating_performance DECIMAL(3,2),
  rating_build_quality DECIMAL(3,2),
  rating_value DECIMAL(3,2),
  rating_battery DECIMAL(3,2),
  
  -- AI Analysis
  sentiment_score DECIMAL(3,2), -- -1 to 1 sentiment
  key_points JSONB, -- AI-extracted key points
  issues_mentioned JSONB, -- Specific issues mentioned
  use_case_context VARCHAR(100), -- gaming, work, study, etc.
  
  -- Credibility Scoring
  helpfulness_score INTEGER DEFAULT 0,
  credibility_score DECIMAL(3,2), -- AI-assessed credibility
  verified_purchase BOOLEAN DEFAULT false,
  
  -- Temporal Data
  review_date DATE,
  ownership_duration VARCHAR(50), -- "6 months", "2 years", etc.
  
  -- Processing Status
  processed_at TIMESTAMP WITH TIME ZONE,
  embedding_vector VECTOR(1536),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Component specifications for detailed component analysis
CREATE TABLE IF NOT EXISTS laptop_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Component Identity
  component_type VARCHAR(50) NOT NULL, -- processor, gpu, memory, storage, display
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(255) NOT NULL,
  generation VARCHAR(50),
  
  -- Performance Data
  benchmark_scores JSONB, -- Component-specific benchmarks
  specifications JSONB, -- Detailed technical specs
  
  -- Market Position
  performance_tier VARCHAR(50), -- entry, mid_range, high_end, flagship
  release_date DATE,
  msrp_usd DECIMAL(10,2),
  
  -- AI Embeddings for component matching
  specs_embedding VECTOR(768),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for laptop-component relationships
CREATE TABLE IF NOT EXISTS laptop_components_mapping (
  laptop_id UUID REFERENCES laptops(id) ON DELETE CASCADE,
  component_id UUID REFERENCES laptop_components(id) ON DELETE CASCADE,
  component_role VARCHAR(50) NOT NULL, -- primary_cpu, dedicated_gpu, etc.
  
  PRIMARY KEY (laptop_id, component_id, component_role)
);

-- Enhanced user preferences for adaptive recommendations
CREATE TABLE IF NOT EXISTS user_laptop_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Budget Constraints
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  financing_preference BOOLEAN DEFAULT false,
  
  -- Use Case Priorities (1-10 scale)
  gaming_priority INTEGER DEFAULT 0,
  professional_priority INTEGER DEFAULT 0,
  creative_priority INTEGER DEFAULT 0,
  student_priority INTEGER DEFAULT 0,
  casual_priority INTEGER DEFAULT 0,
  
  -- Technical Preferences
  preferred_brands JSONB, -- Array of preferred brands
  avoided_brands JSONB, -- Array of brands to avoid
  min_screen_size DECIMAL(3,1),
  max_screen_size DECIMAL(3,1),
  preferred_form_factor JSONB, -- ultrabook, gaming, 2-in-1, etc.
  
  -- Performance Requirements
  min_performance_score INTEGER,
  battery_life_importance INTEGER DEFAULT 5, -- 1-10
  portability_importance INTEGER DEFAULT 5,
  upgrade_importance INTEGER DEFAULT 5,
  
  -- Location and Availability
  location_country VARCHAR(2),
  location_region VARCHAR(100),
  preferred_retailers JSONB,
  
  -- Learning Data
  viewed_laptops JSONB, -- Recently viewed laptop IDs
  saved_laptops JSONB, -- Saved/bookmarked laptops
  rejected_laptops JSONB, -- Explicitly rejected recommendations
  
  -- AI Personalization
  preference_embedding VECTOR(512), -- User preference embeddings
  interaction_history JSONB, -- Click patterns, time spent, etc.
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI-powered laptop recommendations
CREATE TABLE IF NOT EXISTS laptop_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  laptop_id UUID REFERENCES laptops(id),
  
  -- Recommendation Context
  query_text TEXT, -- User's original query
  query_embedding VECTOR(1536),
  
  -- Scoring and Ranking
  relevance_score DECIMAL(5,4) NOT NULL,
  budget_fit_score DECIMAL(3,2),
  performance_match_score DECIMAL(3,2),
  feature_match_score DECIMAL(3,2),
  value_score DECIMAL(3,2),
  
  -- AI Reasoning
  reasoning TEXT NOT NULL, -- AI-generated explanation
  key_matches JSONB, -- Why this laptop matches user needs
  potential_concerns JSONB, -- Possible drawbacks for this user
  alternatives JSONB, -- Alternative laptop suggestions
  
  -- Supporting Evidence
  relevant_reviews JSONB, -- IDs of most relevant reviews
  benchmark_citations JSONB, -- Specific benchmark results cited
  
  -- User Interaction
  user_feedback VARCHAR(50), -- helpful, not_helpful, purchased
  feedback_reason TEXT,
  
  -- Metadata
  recommendation_type VARCHAR(50) DEFAULT 'ai_generated', -- ai_generated, similar, trending
  model_version VARCHAR(50), -- Track which AI model generated this
  confidence_score DECIMAL(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Market intelligence for pricing and availability
CREATE TABLE IF NOT EXISTS laptop_market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laptop_id UUID REFERENCES laptops(id),
  
  -- Pricing Data
  retailer VARCHAR(100) NOT NULL,
  price_current DECIMAL(10,2) NOT NULL,
  price_original DECIMAL(10,2),
  discount_percentage DECIMAL(5,2),
  
  -- Availability
  stock_status VARCHAR(50), -- in_stock, low_stock, out_of_stock
  estimated_restock DATE,
  
  -- Market Position
  price_rank_in_category INTEGER,
  value_rank_in_category INTEGER,
  
  -- Historical Data
  price_history JSONB, -- Price changes over time
  availability_history JSONB,
  
  -- Source Data
  data_source VARCHAR(100),
  last_scraped TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Third-party integration tracking (for future B2B expansion)
CREATE TABLE IF NOT EXISTS integration_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Partner Information
  partner_name VARCHAR(255) NOT NULL,
  partner_type VARCHAR(100), -- retailer, manufacturer, service_provider
  api_endpoint TEXT,
  
  -- Integration Details
  integration_status VARCHAR(50) DEFAULT 'pending',
  supported_categories JSONB,
  data_mapping JSONB, -- How their data maps to our schema
  
  -- Access Control
  api_key_hash TEXT,
  rate_limits JSONB,
  permissions JSONB,
  
  -- Business Terms
  revenue_share_percentage DECIMAL(5,2),
  contract_start DATE,
  contract_end DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create optimized indexes for laptop intelligence queries
CREATE INDEX IF NOT EXISTS idx_laptops_price_range ON laptops(price_usd) WHERE price_usd IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_laptops_brand_model ON laptops(brand, model);
CREATE INDEX IF NOT EXISTS idx_laptops_performance ON laptops USING GIN ((performance_scores));
CREATE INDEX IF NOT EXISTS idx_laptops_use_cases ON laptops USING GIN ((use_cases));
CREATE INDEX IF NOT EXISTS idx_laptops_rating ON laptops(rating_overall DESC) WHERE rating_overall IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_laptops_latest_gen ON laptops(is_latest_gen, release_date DESC) WHERE is_latest_gen = true;

-- Vector similarity indexes for AI-powered search
CREATE INDEX IF NOT EXISTS idx_laptops_embedding ON laptops USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_reviews_embedding ON laptop_reviews USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_laptops_text_search ON laptops USING GIN (to_tsvector('english', name || ' ' || brand || ' ' || model));
CREATE INDEX IF NOT EXISTS idx_reviews_text_search ON laptop_reviews USING GIN (to_tsvector('english', title || ' ' || content));

-- Performance monitoring indexes
CREATE INDEX IF NOT EXISTS idx_recommendations_user_created ON laptop_recommendations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_laptop_retailer ON laptop_market_data(laptop_id, retailer, created_at DESC);

-- RLS policies for enhanced security (extends the security hardening)
ALTER TABLE laptops ENABLE ROW LEVEL SECURITY;
ALTER TABLE laptop_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE laptop_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE laptop_components_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_laptop_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE laptop_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE laptop_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_partners ENABLE ROW LEVEL SECURITY;

-- Public read access for laptop data (with audit logging)
CREATE POLICY "Public laptop read access" ON laptops
  FOR SELECT USING (
    (SELECT validate_and_log_request('laptops', 'SELECT', auth.uid()))
  );

-- Secure review access (only verified reviews visible to public)
CREATE POLICY "Verified review access" ON laptop_reviews
  FOR SELECT USING (
    (SELECT validate_and_log_request('laptop_reviews', 'SELECT', auth.uid()))
    AND (credibility_score >= 0.7 OR verified_purchase = true)
  );

-- User-specific preference access
CREATE POLICY "Own preferences access" ON user_laptop_preferences
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User recommendations access
CREATE POLICY "User recommendation access" ON laptop_recommendations
  FOR SELECT USING (
    user_id = auth.uid() 
    OR user_id IS NULL
  );

-- Admin-only access for sensitive tables
CREATE POLICY "Admin component access" ON laptop_components
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
    AND (SELECT log_access_attempt('laptop_components', TG_OP, auth.uid(), inet_client_addr()))
  );

CREATE POLICY "Partner integration access" ON integration_partners
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
    AND (SELECT log_access_attempt('integration_partners', TG_OP, auth.uid(), inet_client_addr()))
  );