"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = __importDefault(require("../utils/logger"));
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Service role client for admin operations
const supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authorization token required',
                code: 'UNAUTHORIZED',
            });
        }
        const token = authHeader.split(' ')[1];
        // Verify JWT token with Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            logger_1.default.warn('Auth failed:', { error: error?.message, token: token.slice(0, 20) + '...' });
            return res.status(401).json({
                error: 'Invalid or expired token',
                code: 'UNAUTHORIZED',
            });
        }
        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata,
        };
        next();
    }
    catch (error) {
        logger_1.default.error('Auth middleware error:', error);
        res.status(500).json({
            error: 'Authentication error',
            code: 'AUTH_ERROR',
        });
    }
};
exports.authMiddleware = authMiddleware;
// Optional auth - doesn't fail if no token provided
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (!error && user) {
                req.user = {
                    id: user.id,
                    email: user.email,
                    user_metadata: user.user_metadata,
                };
            }
        }
        next();
    }
    catch (error) {
        logger_1.default.error('Optional auth middleware error:', error);
        next(); // Continue even if auth fails
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
