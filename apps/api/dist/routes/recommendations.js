"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const node_crypto_1 = require("node:crypto");
const supabaseClient_1 = require("../db/supabaseClient");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
// Validation schemas
const recommendationSchema = joi_1.default.object({
    prompt: joi_1.default.string().required().min(10).max(1000),
    gadget_id: joi_1.default.string().uuid().optional(),
    budget_range: joi_1.default.array().items(joi_1.default.number()).length(2).optional(),
    preferred_brands: joi_1.default.array().items(joi_1.default.string()).optional(),
    use_cases: joi_1.default.array().items(joi_1.default.string()).optional(),
});
// POST /api/recommendations - Generate AI-powered recommendation
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error: validationError, value } = recommendationSchema.validate(req.body);
    if (validationError) {
        return res.status(400).json({
            error: validationError.details[0].message,
            code: 'VALIDATION_ERROR',
        });
    }
    const { prompt, gadget_id, budget_range, preferred_brands, use_cases } = value;
    const userId = req.user.id;
    try {
        // Get user profile for personalization
        const { data: userProfile } = await supabaseClient_1.supabase
            .from('users')
            .select('preferences')
            .eq('auth_id', userId)
            .single();
        // Step 1: Search for relevant gadgets based on budget and brands
        let relevantGadgets = [];
        if (gadget_id) {
            // Get specific gadget with reviews
            const { data } = await supabaseClient_1.supabase
                .from('gadgets')
                .select(`
          *,
          reviews:reviews(*),
          specs_normalized:specs_normalized(*),
          benchmarks:benchmarks(*)
        `)
                .eq('id', gadget_id)
                .single();
            if (data)
                relevantGadgets = [data];
        }
        else {
            // Search for relevant gadgets based on budget and brands
            let query = supabaseClient_1.supabase
                .from('gadgets')
                .select(`
          *,
          reviews:reviews(rating, content, author, source),
          specs_normalized:specs_normalized(*),
          benchmarks:benchmarks(*)
        `)
                .limit(5);
            if (budget_range) {
                query = query.gte('price', budget_range[0]).lte('price', budget_range[1]);
            }
            if (preferred_brands?.length) {
                query = query.in('brand', preferred_brands);
            }
            const { data } = await query;
            relevantGadgets = data || [];
        }
        // Step 2: Create a basic recommendation result (AI integration placeholder)
        const summary = 'Based on your requirements, here are the recommended laptops.';
        const pros = ['Good performance', 'Reasonable price', 'Reliable brand'];
        const cons = ['Limited availability', 'Higher than budget'];
        const score = 8.5;
        const reasoning = 'These laptops match your specified criteria and budget range.';
        const sources = relevantGadgets.slice(0, 3).map((gadget) => ({
            type: 'review',
            id: gadget.id,
            excerpt: `${gadget.name} - ${gadget.brand}`
        }));
        const alternatives = relevantGadgets.slice(1, 3).map((gadget) => ({
            gadget_id: gadget.id,
            reason: 'Alternative option with similar specs',
            score: score - 0.5
        }));
        const recommendationResult = {
            id: (0, node_crypto_1.randomUUID)(),
            query: req.body.query || 'laptop recommendations',
            recommended_gadgets: relevantGadgets.slice(0, 3).map((g) => g.id),
            confidence_score: score,
            reasoning: reasoning,
            alternatives: alternatives,
            summary: summary,
            pros: pros,
            cons: cons,
            score: score,
            sources: sources,
            context_used: [
                `budget_range: ${JSON.stringify(budget_range)}`,
                `preferred_brands: ${JSON.stringify(preferred_brands)}`,
                `use_cases: ${JSON.stringify(use_cases)}`,
                `user_profile: ${JSON.stringify(userProfile?.preferences || {})}`
            ],
            created_at: new Date().toISOString()
        };
        // Step 3: Save recommendation to database
        const { data: savedRec, error: saveError } = await supabaseClient_1.supabase
            .from('recommendations')
            .insert({
            user_id: userId,
            gadget_id: gadget_id || relevantGadgets[0]?.id,
            prompt,
            result: recommendationResult
        })
            .select()
            .single();
        if (saveError) {
            logger_1.default.error('Failed to save recommendation:', saveError);
            return res.status(500).json({
                error: 'Failed to save recommendation',
                code: 'DATABASE_ERROR',
            });
        }
        logger_1.default.info('Recommendation generated:', {
            id: savedRec.id,
            userId,
            gadgetId: gadget_id,
            promptLength: prompt.length
        });
        const response = {
            success: true,
            data: savedRec
        };
        res.status(201).json(response);
    }
    catch (error) {
        logger_1.default.error('Recommendation generation failed:', error);
        res.status(500).json({
            error: 'Failed to generate recommendation',
            code: 'AI_ERROR',
        });
    }
}));
// GET /api/recommendations - Get user's recommendations
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = parseInt(req.query.offset) || 0;
    const { data, error, count } = await supabaseClient_1.supabase
        .from('recommendations')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) {
        logger_1.default.error('Failed to fetch recommendations:', error);
        return res.status(500).json({
            error: 'Failed to fetch recommendations',
            code: 'DATABASE_ERROR',
        });
    }
    const totalRecommendations = count || 0;
    const page = Math.floor(offset / limit) + 1;
    const pagination = {
        total: totalRecommendations,
        page,
        limit,
        offset,
        totalPages: Math.ceil(totalRecommendations / limit),
        hasMore: totalRecommendations > offset + limit
    };
    const response = {
        success: true,
        data: data || [],
        pagination,
    };
    res.json(response);
}));
// GET /api/recommendations/:id - Get specific recommendation
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { data, error } = await supabaseClient_1.supabase
        .from('recommendations')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
    if (error) {
        if (error.code === 'PGRST116') {
            return res.status(404).json({
                error: 'Recommendation not found',
                code: 'NOT_FOUND',
            });
        }
        return res.status(500).json({
            error: 'Failed to fetch recommendation',
            code: 'DATABASE_ERROR',
        });
    }
    const response = {
        success: true,
        data
    };
    res.json(response);
}));
exports.default = router;
