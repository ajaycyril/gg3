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
const mlRecommender_1 = __importDefault(require("../services/mlRecommender"));
const router = (0, express_1.Router)();
// Validation schemas
const feedbackSchema = joi_1.default.object({
    recommendation_id: joi_1.default.string().uuid().optional(),
    text: joi_1.default.string().max(2000).optional(),
    rating: joi_1.default.number().integer().min(1).max(5).optional(),
});
// POST /api/feedback - Submit feedback
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error: validationError, value } = feedbackSchema.validate(req.body);
    if (validationError) {
        return res.status(400).json({
            error: validationError.details[0].message,
            code: 'VALIDATION_ERROR',
        });
    }
    const { recommendation_id, text, rating } = value;
    const userId = req.user.id;
    // Validate that either text or rating is provided
    if (!text && !rating) {
        return res.status(400).json({
            error: 'Either text or rating must be provided',
            code: 'VALIDATION_ERROR',
        });
    }
    // If recommendation_id is provided, verify it belongs to the user
    if (recommendation_id) {
        const { data: recommendation, error: recError } = await supabaseClient_1.supabase
            .from('recommendations')
            .select('id')
            .eq('id', recommendation_id)
            .eq('user_id', userId)
            .single();
        if (recError || !recommendation) {
            return res.status(404).json({
                error: 'Recommendation not found or access denied',
                code: 'NOT_FOUND',
            });
        }
    }
    const { data, error } = await supabaseClient_1.supabase
        .from('feedback')
        .insert({
        user_id: userId,
        recommendation_id,
        text,
        rating,
    })
        .select()
        .single();
    if (error) {
        logger_1.default.error('Failed to create feedback:', error);
        return res.status(500).json({
            error: 'Failed to submit feedback',
            code: 'DATABASE_ERROR',
        });
    }
    logger_1.default.info('Feedback submitted:', {
        id: data.id,
        userId,
        recommendationId: recommendation_id,
        hasText: !!text,
        rating
    });
    const response = {
        success: true,
        data
    };
    res.status(201).json(response);
}));
// GET /api/feedback - Get user's feedback
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = parseInt(req.query.offset) || 0;
    const { data, error, count } = await supabaseClient_1.supabase
        .from('feedback')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) {
        logger_1.default.error('Failed to fetch feedback:', error);
        return res.status(500).json({
            error: 'Failed to fetch feedback',
            code: 'DATABASE_ERROR',
        });
    }
    const response = {
        success: true,
        data: data || [],
        pagination: {
            total: count || 0,
            page: Math.floor(offset / limit) + 1,
            limit,
            offset,
            hasMore: (count || 0) > offset + limit,
            totalPages: Math.ceil((count || 0) / limit),
        },
    };
    res.json(response);
}));
// PUT /api/feedback/:id - Update feedback
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { error: validationError, value } = feedbackSchema.validate(req.body);
    if (validationError) {
        return res.status(400).json({
            error: validationError.details[0].message,
            code: 'VALIDATION_ERROR',
        });
    }
    const { text, rating } = value;
    const { data, error } = await supabaseClient_1.supabase
        .from('feedback')
        .update({
        ...(text !== undefined && { text }),
        ...(rating !== undefined && { rating }),
    })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
    if (error) {
        if (error.code === 'PGRST116') {
            return res.status(404).json({
                error: 'Feedback not found',
                code: 'NOT_FOUND',
            });
        }
        logger_1.default.error('Failed to update feedback:', error);
        return res.status(500).json({
            error: 'Failed to update feedback',
            code: 'DATABASE_ERROR',
        });
    }
    logger_1.default.info('Feedback updated:', { id, userId });
    const response = {
        success: true,
        data
    };
    res.json(response);
}));
// DELETE /api/feedback/:id - Delete feedback
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { error } = await supabaseClient_1.supabase
        .from('feedback')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    if (error) {
        logger_1.default.error('Failed to delete feedback:', error);
        return res.status(500).json({
            error: 'Failed to delete feedback',
            code: 'DATABASE_ERROR',
        });
    }
    logger_1.default.info('Feedback deleted:', { id, userId });
    res.status(204).send();
}));
/**
 * Record user feedback for ML learning
 */
router.post('/feedback', async (req, res) => {
    try {
        const { sessionId, userId = 'default-user', laptopId, userAction, // 'clicked' | 'purchased' | 'dismissed' | 'compared'
        feedback, // 'positive' | 'negative'
        query, recommendedLaptop } = req.body;
        console.log('📊 Recording user feedback:', { userId, userAction, feedback });
        // Create feedback data
        const feedbackData = {
            sessionId,
            userId,
            query,
            recommendedLaptop,
            userAction,
            feedback,
            timestamp: new Date()
        };
        // Process feedback through ML system
        await mlRecommender_1.default.processFeedback(feedbackData);
        // Store in database for persistence (optional)
        // await supabase.from('user_feedback').insert(feedbackData);
        res.json({
            success: true,
            message: 'Feedback recorded successfully'
        });
    }
    catch (error) {
        console.error('❌ Feedback recording failed:', error);
        logger_1.default.error('Feedback processing error:', error);
        res.status(500).json({
            error: 'Failed to record feedback',
            message: error?.message || 'unknown'
        });
    }
});
/**
 * Get ML-powered recommendations directly
 */
router.post('/ml-recommendations', async (req, res) => {
    try {
        const { userId = 'default-user', sessionId, purpose = ['general'], budget = { min: 300, max: 3000 }, brands = [], specs = {}, priorities = [], text = '' } = req.body;
        console.log('🤖 Direct ML recommendation request for:', purpose);
        const userQuery = {
            purpose,
            budget,
            brands,
            specs,
            priorities,
            text
        };
        const recommendations = await mlRecommender_1.default.getRecommendations(userQuery, userId, sessionId);
        res.json({
            success: true,
            recommendations: recommendations.map(scored => ({
                laptop: scored.laptop,
                score: scored.score,
                reasoning: scored.reasonings.join('. '),
                highlights: scored.highlights,
                warnings: scored.warnings,
                metrics: {
                    valueScore: scored.valueScore,
                    similarityScore: scored.similarityScore,
                    recencyScore: scored.recencyScore
                }
            }))
        });
    }
    catch (error) {
        console.error('❌ ML recommendations failed:', error);
        logger_1.default.error('ML recommendation error:', error);
        res.status(500).json({
            error: 'Failed to generate recommendations',
            message: error?.message || 'unknown'
        });
    }
});
/**
 * Analytics endpoint for ML performance
 */
router.get('/ml-analytics', async (req, res) => {
    try {
        // This would provide insights into ML performance
        res.json({
            success: true,
            analytics: {
                totalRecommendations: 0,
                userSatisfactionRate: 0,
                averageValueScore: 0,
                topPerformingBrands: [],
                commonPurposes: ['gaming', 'work', 'student']
            }
        });
    }
    catch (error) {
        console.error('❌ ML analytics failed:', error);
        res.status(500).json({
            error: 'Failed to get analytics'
        });
    }
});
exports.default = router;
