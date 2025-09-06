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
const preferencesSchema = joi_1.default.object({
    budget_range: joi_1.default.array().items(joi_1.default.number()).length(2).optional(),
    preferred_brands: joi_1.default.array().items(joi_1.default.string()).optional(),
    use_cases: joi_1.default.array().items(joi_1.default.string()).optional(),
    experience_level: joi_1.default.string().valid('beginner', 'intermediate', 'expert').optional(),
    notifications_enabled: joi_1.default.boolean().optional(),
    saved_searches: joi_1.default.array().items(joi_1.default.string()).optional(),
    saved_gadgets: joi_1.default.array().items(joi_1.default.string().uuid()).optional(),
});
const profileSchema = joi_1.default.object({
    display_name: joi_1.default.string().max(100).optional(),
    preferences: preferencesSchema.optional(),
});
// GET /api/users/profile - Get current user profile
router.get('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { data, error } = await supabaseClient_1.supabase
        .from('users')
        .select('*')
        .eq('auth_id', userId)
        .single();
    if (error && error.code !== 'PGRST116') {
        logger_1.default.error('Failed to fetch user profile:', error);
        return res.status(500).json({
            error: 'Failed to fetch profile',
            code: 'DATABASE_ERROR',
        });
    }
    // Create profile if doesn't exist
    if (!data) {
        const userData = {
            id: req.user.id,
            email: req.user.email,
            // Extract user metadata safely
            full_name: req.user.user_metadata?.full_name || null,
            avatar_url: req.user.user_metadata?.avatar_url || null,
        };
        const { data: newProfile, error: createError } = await supabaseClient_1.supabase
            .from('users')
            .insert({
            auth_id: userId,
            email: req.user.email,
            display_name: req.user.user_metadata?.display_name,
            preferences: {}
        })
            .select()
            .single();
        if (createError) {
            logger_1.default.error('Failed to create user profile:', createError);
            return res.status(500).json({
                error: 'Failed to create profile',
                code: 'DATABASE_ERROR',
            });
        }
        const response = {
            success: true,
            data: newProfile
        };
        return res.json(response);
    }
    const response = {
        success: true,
        data
    };
    res.json(response);
}));
// PUT /api/users/profile - Update user profile
router.put('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error: validationError, value } = profileSchema.validate(req.body);
    if (validationError) {
        return res.status(400).json({
            error: validationError.details[0].message,
            code: 'VALIDATION_ERROR',
        });
    }
    const userId = req.user.id;
    const { display_name, preferences } = value;
    const { data, error } = await supabaseClient_1.supabase
        .from('users')
        .update({
        ...(display_name && { display_name }),
        ...(preferences && { preferences })
    })
        .eq('auth_id', userId)
        .select()
        .single();
    if (error) {
        logger_1.default.error('Failed to update user profile:', error);
        return res.status(500).json({
            error: 'Failed to update profile',
            code: 'DATABASE_ERROR',
        });
    }
    logger_1.default.info('User profile updated:', { userId, updates: Object.keys(value) });
    const response = {
        success: true,
        data
    };
    res.json(response);
}));
// GET /api/users/preferences - Get user preferences
router.get('/preferences', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { data, error } = await supabaseClient_1.supabase
        .from('users')
        .select('preferences')
        .eq('auth_id', userId)
        .single();
    if (error) {
        logger_1.default.error('Failed to fetch user preferences:', error);
        return res.status(500).json({
            error: 'Failed to fetch preferences',
            code: 'DATABASE_ERROR',
        });
    }
    const response = {
        success: true,
        data: data?.preferences || {}
    };
    res.json(response);
}));
// PUT /api/users/preferences - Update user preferences
router.put('/preferences', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error: validationError, value } = preferencesSchema.validate(req.body);
    if (validationError) {
        return res.status(400).json({
            error: validationError.details[0].message,
            code: 'VALIDATION_ERROR',
        });
    }
    const userId = req.user.id;
    const { data, error } = await supabaseClient_1.supabase
        .from('users')
        .update({ preferences: value })
        .eq('auth_id', userId)
        .select('preferences')
        .single();
    if (error) {
        logger_1.default.error('Failed to update user preferences:', error);
        return res.status(500).json({
            error: 'Failed to update preferences',
            code: 'DATABASE_ERROR',
        });
    }
    logger_1.default.info('User preferences updated:', { userId });
    const response = {
        success: true,
        data: data.preferences
    };
    res.json(response);
}));
// POST /api/users/save-gadget - Save/unsave a gadget
router.post('/save-gadget', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { gadget_id, action } = req.body;
    if (!gadget_id || !['save', 'unsave'].includes(action)) {
        return res.status(400).json({
            error: 'Invalid gadget_id or action',
            code: 'VALIDATION_ERROR',
        });
    }
    const userId = req.user.id;
    // Get current preferences
    const { data: userData, error: fetchError } = await supabaseClient_1.supabase
        .from('users')
        .select('preferences')
        .eq('auth_id', userId)
        .single();
    if (fetchError) {
        return res.status(500).json({
            error: 'Failed to fetch user data',
            code: 'DATABASE_ERROR',
        });
    }
    const preferences = userData?.preferences || {};
    const savedGadgets = new Set(preferences.saved_gadgets || []);
    if (action === 'save') {
        savedGadgets.add(gadget_id);
    }
    else {
        savedGadgets.delete(gadget_id);
    }
    const updatedPreferences = {
        ...preferences,
        saved_gadgets: Array.from(savedGadgets)
    };
    const { error: updateError } = await supabaseClient_1.supabase
        .from('users')
        .update({ preferences: updatedPreferences })
        .eq('auth_id', userId);
    if (updateError) {
        return res.status(500).json({
            error: 'Failed to update saved gadgets',
            code: 'DATABASE_ERROR',
        });
    }
    const response = {
        success: true,
        data: {
            message: `Gadget ${action}d successfully`,
            saved_gadgets: Array.from(savedGadgets)
        }
    };
    res.json(response);
}));
exports.default = router;
