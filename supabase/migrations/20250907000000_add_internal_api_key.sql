-- Add internal API key for web app to API communication
-- This key should match INTERNAL_API_KEY in your .env files

DO $$
DECLARE
    internal_key_hash VARCHAR(64);
    internal_key_prefix VARCHAR(8);
BEGIN
    -- Hash of 'gg3_internal_2025_secure_key_prod'
    internal_key_hash := encode(digest('gg3_internal_2025_secure_key_prod', 'sha256'), 'hex');
    internal_key_prefix := 'gg3_inte';
    
    -- Insert the internal API key for the default tenant
    INSERT INTO public.tenant_api_keys (
        id,
        tenant_id,
        name,
        key_hash,
        key_prefix,
        scopes,
        quotas,
        expires_at
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000001', -- Default tenant ID
        'Internal Web App API Key',
        internal_key_hash,
        internal_key_prefix,
        '["read", "write", "ai", "recommendations"]',
        '{"requests_per_hour": 10000, "ai_requests_per_hour": 1000}',
        NULL -- Never expires
    ) ON CONFLICT (key_hash) DO UPDATE SET
        name = EXCLUDED.name,
        scopes = EXCLUDED.scopes,
        quotas = EXCLUDED.quotas,
        updated_at = NOW();
    
    RAISE NOTICE 'Internal API key created/updated successfully';
END $$;