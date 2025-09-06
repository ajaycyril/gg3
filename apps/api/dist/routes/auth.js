"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabaseClient_1 = require("../db/supabaseClient");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
// Validation schemas
const signInSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
});
const magicLinkSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    redirectTo: joi_1.default.string().uri().optional(),
});
// POST /api/auth/signin - Email/Password sign in
router.post('/signin', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error: validationError, value } = signInSchema.validate(req.body);
    if (validationError) {
        return res.status(400).json({
            error: validationError.details[0].message,
            code: 'VALIDATION_ERROR',
        });
    }
    const { email, password } = value;
    const { data, error } = await supabaseClient_1.supabaseAdmin.auth.signInWithPassword({
        email,
        password,
    });
    if (error) {
        logger_1.default.warn('Sign in failed:', { email, error: error.message });
        return res.status(401).json({
            error: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS',
        });
    }
    // Create or update user profile
    if (data.user) {
        await supabaseClient_1.supabaseAdmin
            .from('users')
            .upsert({
            auth_id: data.user.id,
            email: data.user.email || '',
            display_name: data.user.user_metadata?.display_name || '',
        }, {
            onConflict: 'auth_id'
        });
    }
    const response = {
        data: {
            user: {
                id: data.user.id,
                email: data.user.email,
                user_metadata: data.user.user_metadata,
            },
            session: data.session,
        },
    };
    res.json(response);
}));
// POST /api/auth/signup - Email/Password sign up
router.post('/signup', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error: validationError, value } = signInSchema.validate(req.body);
    if (validationError) {
        return res.status(400).json({
            error: validationError.details[0].message,
            code: 'VALIDATION_ERROR',
        });
    }
    const { email, password } = value;
    const { data, error } = await supabaseClient_1.supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
            data: {
                display_name: email.split('@')[0],
            }
        }
    });
    if (error) {
        logger_1.default.warn('Sign up failed:', { email, error: error.message });
        return res.status(400).json({
            error: error.message,
            code: 'SIGNUP_ERROR',
        });
    }
    const response = {
        data: {
            message: data.user?.email_confirmed_at
                ? 'Account created successfully'
                : 'Please check your email to confirm your account',
            user: data.user ? {
                id: data.user.id,
                email: data.user.email,
                user_metadata: data.user.user_metadata,
            } : undefined,
        },
    };
    res.json(response);
}));
// POST /api/auth/magic-link - Send magic link
router.post('/magic-link', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error: validationError, value } = magicLinkSchema.validate(req.body);
    if (validationError) {
        return res.status(400).json({
            error: validationError.details[0].message,
            code: 'VALIDATION_ERROR',
        });
    }
    const { email, redirectTo } = value;
    const { error } = await supabaseClient_1.supabaseAdmin.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: redirectTo || `${process.env.FRONTEND_URL}/auth/callback`,
        },
    });
    if (error) {
        logger_1.default.warn('Magic link failed:', { email, error: error.message });
        return res.status(400).json({
            error: 'Failed to send magic link',
            code: 'MAGIC_LINK_ERROR',
        });
    }
    const response = {
        data: {
            message: 'Magic link sent to your email',
        },
    };
    res.json(response);
}));
// POST /api/auth/signout - Sign out
router.post('/signout', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        await supabaseClient_1.supabaseAdmin.auth.signOut(token);
    }
    const response = {
        data: {
            message: 'Signed out successfully',
        },
    };
    res.json(response);
}));
// GET /api/auth/user - Get current user
router.get('/user', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'No token provided',
            code: 'NO_TOKEN',
        });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseClient_1.supabaseAdmin.auth.getUser(token);
    if (error || !user) {
        return res.status(401).json({
            error: 'Invalid token',
            code: 'INVALID_TOKEN',
        });
    }
    const response = {
        data: {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata,
        },
    };
    res.json(response);
}));
exports.default = router;
