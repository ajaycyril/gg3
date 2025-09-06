"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const supabaseClient_1 = require("../db/supabaseClient");
const shared_1 = require("@gadgetguru/shared");
const logger_1 = __importDefault(require("../utils/logger"));
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new shared_1.AppError('No authorization header provided', 401);
        }
        const token = authHeader.replace('Bearer ', '');
        if (!token) {
            throw new shared_1.AppError('No token provided', 401);
        }
        // Verify the JWT token with Supabase
        const { data: { user }, error } = await supabaseClient_1.supabase.auth.getUser(token);
        if (error || !user) {
            throw new shared_1.AppError('Invalid or expired token', 401);
        }
        // Attach user to request object
        req.user = {
            id: user.id,
            email: user.email
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authMiddleware = authMiddleware;
// Optional auth - doesn't fail if no token provided
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user }, error } = await supabaseClient_1.supabase.auth.getUser(token);
            if (!error && user) {
                req.user = {
                    id: user.id,
                    email: user.email,
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
