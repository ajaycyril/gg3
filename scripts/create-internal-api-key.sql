-- Add internal API key for web app to API communication
-- Run this in your Supabase SQL editor: https://supabase.com/dashboard/project/tmhsncpaecgkkzrdkjnm/sql

-- First, let's check if we have the required tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'tenant_api_keys');

-- Insert the internal API key
DO $$
DECLARE
    internal_key_hash TEXT;
    internal_key_prefix TEXT := 'gg3_inte';
    default_tenant_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Create SHA256 hash of the API key
    internal_key_hash := encode(digest('gg3_internal_2025_secure_key_prod', 'sha256'), 'hex');
    
    -- Ensure default tenant exists
    INSERT INTO public.tenants (
        id,
        name,
        slug,
        created_at,
        updated_at
    ) VALUES (
        default_tenant_id,
        'Default Tenant',
        'default',
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Insert the internal API key
    INSERT INTO public.tenant_api_keys (
        id,
        tenant_id,
        name,
        key_hash,
        key_prefix,
        scopes,
        quotas,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        default_tenant_id,
        'Internal Web App API Key',
        internal_key_hash,
        internal_key_prefix,
        '["read", "write", "ai", "recommendations"]',
        '{"requests_per_hour": 10000, "ai_requests_per_hour": 1000}',
        NOW(),
        NOW()
    ) ON CONFLICT (key_hash) DO UPDATE SET
        name = EXCLUDED.name,
        scopes = EXCLUDED.scopes,
        quotas = EXCLUDED.quotas,
        updated_at = NOW();
    
    RAISE NOTICE 'Internal API key created successfully with hash: %', internal_key_hash;
END $$;

-- Verify the key was created
SELECT 
    id,
    tenant_id,
    name,
    key_prefix,
    scopes,
    created_at
FROM public.tenant_api_keys 
WHERE key_prefix = 'gg3_inte';