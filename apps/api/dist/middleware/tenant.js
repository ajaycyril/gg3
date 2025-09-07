"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireScopes = exports.tenantMiddleware = void 0;
const crypto_1 = require("crypto");
const supabaseClient_1 = require("../db/supabaseClient");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Hash API key for secure storage comparison
 */
async function hashApiKey(apiKey) {
    return (0, crypto_1.createHash)('sha256').update(apiKey).digest('hex');
}
/**
 * Validate API key and return tenant context
 */
async function validateApiKey(apiKey) {
    try {
        // Extract key prefix (first 8 characters)
        const keyPrefix = apiKey.substring(0, 8);
        // Hash the full key for comparison
        const keyHash = await hashApiKey(apiKey);
        // Query database for API key
        const { data: apiKeyData, error } = await supabaseClient_1.supabaseAdmin
            .from('tenant_api_keys')
            .select(`
        id,
        tenant_id,
        name,
        scopes,
        quotas,
        expires_at,
        deleted_at,
        tenant:tenants(*)
      `)
            .eq('key_hash', keyHash)
            .eq('key_prefix', keyPrefix)
            .is('deleted_at', null)
            .single();
        if (error || !apiKeyData) {
            logger_1.default.warn('Invalid API key attempt:', {
                keyPrefix,
                error: error?.message
            });
            return null;
        }
        // Check if key is expired
        if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
            logger_1.default.warn('Expired API key used:', { keyPrefix, expires_at: apiKeyData.expires_at });
            return null;
        }
        // Check if tenant is active
        const tenant = apiKeyData.tenant;
        if (!tenant || tenant.deleted_at) {
            logger_1.default.warn('Inactive tenant for API key:', { keyPrefix, tenant_id: apiKeyData.tenant_id });
            return null;
        }
        // Update last used timestamp
        await supabaseClient_1.supabaseAdmin
            .from('tenant_api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', apiKeyData.id);
        return {
            tenant_id: apiKeyData.tenant_id,
            tenant: apiKeyData.tenant,
            api_key: {
                id: apiKeyData.id,
                name: apiKeyData.name,
                scopes: apiKeyData.scopes || [],
                quotas: apiKeyData.quotas || {}
            }
        };
    }
    catch (error) {
        logger_1.default.error('Error validating API key:', error);
        return null;
    }
}
/**
 * Tenant middleware for multi-tenant API access control
 */
const tenantMiddleware = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(401).json({
                error: 'API key required',
                code: 'MISSING_API_KEY'
            });
        }
        const tenantContext = await validateApiKey(apiKey);
        if (!tenantContext) {
            return res.status(401).json({
                error: 'Invalid API key',
                code: 'INVALID_API_KEY'
            });
        }
        // Attach tenant context to request
        req.tenant = tenantContext;
        // Log successful tenant access
        logger_1.default.debug('Tenant access granted', {
            tenant_id: tenantContext.tenant_id,
            api_key_name: tenantContext.api_key?.name
        });
        next();
    }
    catch (error) {
        logger_1.default.error('Tenant middleware error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'TENANT_MIDDLEWARE_ERROR'
        });
    }
};
exports.tenantMiddleware = tenantMiddleware;
/**
 * Require that the API key includes all specified scopes.
 */
const requireScopes = (required) => {
    const needed = Array.isArray(required) ? required : [required];
    return (req, res, next) => {
        try {
            const scopes = req.tenant?.api_key?.scopes || [];
            const ok = needed.every((s) => scopes.includes(s));
            if (!ok) {
                return res.status(403).json({ error: 'Insufficient scope', required: needed, have: scopes });
            }
            next();
        }
        catch (err) {
            logger_1.default.error('requireScopes error:', err);
            return res.status(500).json({ error: 'Scope check failed' });
        }
    };
};
exports.requireScopes = requireScopes;
