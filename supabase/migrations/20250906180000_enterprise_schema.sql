-- =============================================================================
-- GadgetGuru Enterprise Database Schema
-- Multi-tenant SaaS Product Intelligence Platform
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
-- =============================================================================
-- 1. MULTI-TENANT FOUNDATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT,
    plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
    settings JSONB DEFAULT '{}',
    quotas JSONB DEFAULT '{"requests_per_hour": 1000, "storage_gb": 10}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS public.tenant_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    scopes TEXT[] DEFAULT '{"read"}',
    quotas JSONB DEFAULT '{"requests_per_hour": 100}',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
-- =============================================================================
-- 2. CATEGORY-AGNOSTIC PRODUCT MODEL
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.categories(id),
    hierarchy_path TEXT[], -- For efficient queries
    level INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(tenant_id, slug)
);
CREATE TABLE IF NOT EXISTS public.attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('text', 'number', 'boolean', 'enum', 'range')),
    unit TEXT, -- e.g., 'GB', 'inches', 'Hz'
    enum_values TEXT[], -- For enum type
    validation_rules JSONB DEFAULT '{}', -- min/max for numbers, regex for text
    is_required BOOLEAN DEFAULT FALSE,
    is_filterable BOOLEAN DEFAULT TRUE,
    is_searchable BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(tenant_id, category_id, slug)
);
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id),
    
    -- Identity fields for deduplication
    gtin TEXT, -- Global Trade Item Number (includes UPC/EAN)
    mpn TEXT, -- Manufacturer Part Number
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    
    -- Basic product info
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'discontinued')),
    
    -- Raw vendor data (for provenance, don't query directly)
    raw_specs JSONB DEFAULT '{}',
    source_urls TEXT[],
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(tenant_id, gtin) DEFERRABLE,
    UNIQUE(tenant_id, brand, mpn) DEFERRABLE
);
CREATE TABLE IF NOT EXISTS public.product_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
    
    -- Typed values for efficient filtering
    value_text TEXT,
    value_number DECIMAL,
    value_boolean BOOLEAN,
    value_enum TEXT,
    value_range_min DECIMAL,
    value_range_max DECIMAL,
    
    -- Original value and unit for display
    original_value TEXT,
    original_unit TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, product_id, attribute_id)
);
-- =============================================================================
-- 3. VARIANTS, OFFERS, PRICE & INVENTORY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    sku TEXT,
    gtin TEXT, -- Variant-specific GTIN
    
    -- Variant-specific attributes (RAM, storage, color, etc.)
    variant_attributes JSONB DEFAULT '{}',
    
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'discontinued')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(tenant_id, product_id, name)
);
CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    domain TEXT,
    country_code TEXT,
    currency TEXT DEFAULT 'USD',
    affiliate_program TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(tenant_id, domain)
);
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    
    -- Pricing
    price DECIMAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    original_price DECIMAL, -- For discounts
    
    -- Affiliate tracking
    url TEXT NOT NULL,
    affiliate_id TEXT,
    partner_id TEXT,
    campaign_id TEXT,
    utm_params JSONB DEFAULT '{}',
    
    -- Availability
    availability TEXT DEFAULT 'in_stock' CHECK (availability IN ('in_stock', 'out_of_stock', 'limited', 'preorder')),
    condition TEXT DEFAULT 'new' CHECK (condition IN ('new', 'refurbished', 'used')),
    stock_quantity INTEGER,
    
    -- Metadata
    shipping_cost DECIMAL,
    shipping_days INTEGER,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(tenant_id, product_id, variant_id, seller_id, url)
);
-- Price history for trends (append-only)
CREATE TABLE IF NOT EXISTS public.offer_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    
    price DECIMAL NOT NULL,
    availability TEXT NOT NULL,
    stock_quantity INTEGER,
    
    recorded_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (recorded_at);
-- Currency exchange rates
CREATE TABLE IF NOT EXISTS public.fx_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate DECIMAL NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(from_currency, to_currency, recorded_at)
);
-- =============================================================================
-- 4. UNSTRUCTURED CONTENT & REVIEWS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.unstructured_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    source TEXT NOT NULL, -- 'review', 'article', 'spec_sheet', 'manual'
    source_url TEXT,
    title TEXT,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL, -- For deduplication
    language TEXT DEFAULT 'en',
    
    -- Content metadata
    author_display_name TEXT,
    author_source_profile TEXT,
    published_at TIMESTAMPTZ,
    
    -- Moderation & Quality
    moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    quality_score DECIMAL CHECK (quality_score >= 0 AND quality_score <= 1),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(tenant_id, content_hash)
);
CREATE TABLE IF NOT EXISTS public.doc_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    doc_id UUID NOT NULL REFERENCES public.unstructured_docs(id) ON DELETE CASCADE,
    
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    char_start INTEGER NOT NULL,
    char_end INTEGER NOT NULL,
    token_count INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, doc_id, chunk_index)
);
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    doc_id UUID NOT NULL REFERENCES public.unstructured_docs(id) ON DELETE CASCADE,
    
    rating DECIMAL CHECK (rating >= 1 AND rating <= 5),
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    
    -- Review thread support
    parent_id UUID REFERENCES public.reviews(id),
    thread_depth INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
-- =============================================================================
-- 5. VECTOR SEARCH & HYBRID RETRIEVAL
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    entity_type TEXT NOT NULL, -- 'product', 'chunk', 'review'
    entity_id UUID NOT NULL,
    
    -- Model metadata
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    dimension INTEGER NOT NULL,
    embedding_version TEXT NOT NULL,
    
    -- Vector data
    embedding VECTOR,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, entity_type, entity_id, model_name, embedding_version)
);
-- Full-text search support
CREATE TABLE IF NOT EXISTS public.search_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    
    title TEXT,
    content TEXT,
    search_vector TSVECTOR,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, entity_type, entity_id)
);
-- =============================================================================
-- 6. BENCHMARKS & PERFORMANCE METADATA
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.benchmark_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'cpu', 'gpu', 'ssd', 'battery', 'thermal', 'overall'
    unit TEXT NOT NULL,
    higher_is_better BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, name)
);
CREATE TABLE IF NOT EXISTS public.benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    benchmark_type_id UUID NOT NULL REFERENCES public.benchmark_types(id),
    
    -- Score statistics
    score_mean DECIMAL NOT NULL,
    score_variance DECIMAL,
    run_count INTEGER DEFAULT 1,
    
    -- Test configuration
    test_version TEXT,
    methodology TEXT,
    device_config JSONB DEFAULT '{}', -- RAM, SSD, BIOS version, etc.
    
    -- Source provenance
    source_url TEXT,
    tester_name TEXT,
    test_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================================================
-- 7. SCRAPING & PROVENANCE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crawl_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    source_domain TEXT NOT NULL,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    
    -- Configuration
    config JSONB DEFAULT '{}',
    parser_name TEXT NOT NULL,
    parser_version TEXT NOT NULL,
    
    -- Progress tracking
    urls_queued INTEGER DEFAULT 0,
    urls_completed INTEGER DEFAULT 0,
    urls_failed INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.crawl_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.crawl_jobs(id) ON DELETE CASCADE,
    
    url TEXT NOT NULL,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'fetched', 'parsed', 'error')),
    
    -- HTTP details
    http_status INTEGER,
    content_hash TEXT,
    content_type TEXT,
    
    -- Parsing results
    parsed_data JSONB,
    error_message TEXT,
    
    -- Robots.txt compliance
    robots_allowed BOOLEAN,
    robots_metadata JSONB DEFAULT '{}',
    
    -- Timing
    fetched_at TIMESTAMPTZ,
    parsed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, job_id, url)
) PARTITION BY RANGE (created_at);
-- =============================================================================
-- 8. RECOMMENDATIONS, EXPERIMENTS & EXPLANATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.recommendation_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    user_id TEXT, -- Can be anonymous
    session_id TEXT,
    
    -- Model metadata
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    
    -- Request context
    query_text TEXT,
    filters JSONB DEFAULT '{}',
    candidate_set_hash TEXT, -- Snapshot of what was considered
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    set_id UUID NOT NULL REFERENCES public.recommendation_sets(id) ON DELETE CASCADE,
    
    product_id UUID NOT NULL REFERENCES public.products(id),
    rank INTEGER NOT NULL,
    score DECIMAL NOT NULL,
    
    -- Explanations
    reasoning_bullets TEXT[],
    evidence_links JSONB DEFAULT '{}',
    feature_attribution JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, set_id, product_id)
);
-- A/B Testing infrastructure
CREATE TABLE IF NOT EXISTS public.experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
    
    -- Configuration
    traffic_allocation DECIMAL DEFAULT 0.1,
    target_metric TEXT NOT NULL,
    
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, name)
);
CREATE TABLE IF NOT EXISTS public.experiment_arms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    allocation DECIMAL NOT NULL, -- 0.0 to 1.0
    config JSONB DEFAULT '{}',
    
    UNIQUE(tenant_id, experiment_id, name)
);
CREATE TABLE IF NOT EXISTS public.experiment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
    arm_id UUID NOT NULL REFERENCES public.experiment_arms(id),
    
    user_id TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, experiment_id, user_id)
);
-- =============================================================================
-- 9. FEATURE STORE & MODEL REGISTRY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.features_latest (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    feature_name TEXT NOT NULL,
    feature_value JSONB NOT NULL,
    
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, entity_type, entity_id, feature_name)
);
CREATE TABLE IF NOT EXISTS public.features_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    feature_name TEXT NOT NULL,
    feature_value JSONB NOT NULL,
    
    computed_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (computed_at);
CREATE TABLE IF NOT EXISTS public.model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    model_type TEXT NOT NULL, -- 'ranking', 'embedding', 'classification'
    
    -- Artifact storage
    artifact_url TEXT, -- Object storage URL (ONNX, pickle, etc.)
    artifact_checksum TEXT,
    
    -- Training metadata
    training_data_snapshot TEXT,
    metrics JSONB DEFAULT '{}',
    hyperparameters JSONB DEFAULT '{}',
    
    -- Deployment
    status TEXT DEFAULT 'training' CHECK (status IN ('training', 'testing', 'production', 'archived')),
    deployment_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, name, version)
);
-- =============================================================================
-- 10. EVENTS, ANALYTICS & COST CONTROL
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    user_id TEXT,
    session_id TEXT,
    
    event_type TEXT NOT NULL,
    event_name TEXT NOT NULL,
    
    -- Event payload
    properties JSONB DEFAULT '{}',
    
    -- Timing
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Context
    user_agent TEXT,
    ip_address INET,
    referrer TEXT
) PARTITION BY RANGE (occurred_at);
-- =============================================================================
-- 11. SECURITY, PRIVACY & GOVERNANCE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_pii (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    user_id TEXT NOT NULL,
    
    -- PII fields (encrypted at application layer)
    email TEXT,
    full_name TEXT,
    phone TEXT,
    address JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    action TEXT NOT NULL,
    actor_id TEXT,
    actor_type TEXT, -- 'user', 'service', 'admin'
    
    -- What was changed
    resource_type TEXT NOT NULL,
    resource_id UUID,
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    
    occurred_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (occurred_at);
CREATE TABLE IF NOT EXISTS public.data_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Output entity
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    
    -- Source entity
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    
    -- Process metadata
    process_name TEXT NOT NULL, -- 'parser', 'model', 'enrichment'
    process_version TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================================================
-- 12. INTERNATIONALIZATION & LOCALIZATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.localized_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    locale TEXT NOT NULL, -- 'en-US', 'de-DE', etc.
    
    field_name TEXT NOT NULL, -- 'name', 'description'
    content TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, entity_type, entity_id, locale, field_name)
);
-- =============================================================================
-- 13. INTEGRATION & INTEROPERABILITY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.external_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    external_system TEXT NOT NULL, -- 'amazon', 'google_merchant', 'shopify'
    external_id TEXT NOT NULL,
    
    entity_type TEXT NOT NULL, -- 'product', 'variant', 'offer'
    entity_id UUID NOT NULL,
    
    sync_metadata JSONB DEFAULT '{}',
    last_synced_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, external_system, external_id, entity_type)
);
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    event_types TEXT[] NOT NULL,
    
    -- Security
    secret TEXT,
    headers JSONB DEFAULT '{}',
    
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'failed')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
    response_status INTEGER,
    response_body TEXT,
    
    attempts INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);
-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Multi-tenant indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant ON public.tenant_api_keys(tenant_id, key_prefix) WHERE deleted_at IS NULL;
-- Product catalog indexes
CREATE INDEX IF NOT EXISTS idx_categories_tenant_parent ON public.categories(tenant_id, parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_hierarchy ON public.categories USING GIN(hierarchy_path) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_tenant_category ON public.products(tenant_id, category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_brand_model ON public.products(tenant_id, brand, model) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_attributes_filtering ON public.product_attributes(tenant_id, attribute_id, value_number, value_text, value_boolean);
-- Offers and pricing
CREATE INDEX IF NOT EXISTS idx_offers_product_seller ON public.offers(tenant_id, product_id, seller_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_offers_price ON public.offers(tenant_id, price, currency) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_offer_history_time ON public.offer_history(tenant_id, offer_id, recorded_at);
-- Search and embeddings
CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON public.embeddings(tenant_id, entity_type, entity_id, model_name);
CREATE INDEX IF NOT EXISTS idx_search_documents_fts ON public.search_documents USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_unstructured_docs_hash ON public.unstructured_docs(tenant_id, content_hash);
-- Analytics and events
CREATE INDEX IF NOT EXISTS idx_events_tenant_type ON public.events(tenant_id, event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_user_session ON public.events(tenant_id, user_id, session_id, occurred_at);
-- Crawling and data pipeline
CREATE INDEX IF NOT EXISTS idx_crawl_items_job_status ON public.crawl_items(tenant_id, job_id, status);
CREATE INDEX IF NOT EXISTS idx_crawl_items_url_hash ON public.crawl_items(tenant_id, url, content_hash);
-- =============================================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================================================

-- Latest offer per product variant
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_latest_offers AS
SELECT DISTINCT ON (tenant_id, product_id, COALESCE(variant_id, gen_random_uuid()))
    tenant_id,
    product_id,
    variant_id,
    seller_id,
    price,
    currency,
    availability,
    url,
    updated_at
FROM public.offers 
WHERE deleted_at IS NULL
ORDER BY tenant_id, product_id, COALESCE(variant_id, gen_random_uuid()), updated_at DESC;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_latest_offers_unique 
ON public.mv_latest_offers(tenant_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
-- Top attributes per category for faceting
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_category_attributes AS
SELECT 
    pa.tenant_id,
    p.category_id,
    pa.attribute_id,
    a.name as attribute_name,
    a.data_type,
    COUNT(*) as product_count,
    COUNT(DISTINCT pa.value_text) as distinct_text_values,
    MIN(pa.value_number) as min_number_value,
    MAX(pa.value_number) as max_number_value
FROM public.product_attributes pa
JOIN public.products p ON pa.product_id = p.id AND pa.tenant_id = p.tenant_id
JOIN public.attributes a ON pa.attribute_id = a.id AND pa.tenant_id = a.tenant_id
WHERE p.deleted_at IS NULL AND p.status = 'active'
GROUP BY pa.tenant_id, p.category_id, pa.attribute_id, a.name, a.data_type;
-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unstructured_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- Tenant isolation policies (set app.tenant_id per request)
CREATE POLICY "tenant_isolation" ON public.categories
    FOR ALL USING (tenant_id = COALESCE(current_setting('app.tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY "tenant_isolation" ON public.products 
    FOR ALL USING (tenant_id = COALESCE(current_setting('app.tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY "tenant_isolation" ON public.offers
    FOR ALL USING (tenant_id = COALESCE(current_setting('app.tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
-- Apply similar policies to all other tenant-scoped tables...
-- (This is a template - you'd need to create similar policies for all tables)

-- =============================================================================
-- FUNCTIONS FOR TENANT CONTEXT
-- =============================================================================

-- Function to set tenant context
CREATE OR REPLACE FUNCTION public.set_tenant_context(tenant_uuid UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.tenant_id', tenant_uuid::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to get current tenant
CREATE OR REPLACE FUNCTION public.get_current_tenant()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(current_setting('app.tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
