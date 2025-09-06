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
const openai_1 = require("openai");
const router = (0, express_1.Router)();
// Initialize OpenAI (will be used for RAG recommendations)
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
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
        // Step 1: Vector similarity search (placeholder for now)
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
        // Step 2: Construct context for LLM
        const context = relevantGadgets.map(gadget => ({
            name: gadget.name,
            brand: gadget.brand,
            price: gadget.price,
            specs: gadget.specs,
            avgRating: gadget.reviews?.length
                ? gadget.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / gadget.reviews.length
                : null,
            keyReviews: gadget.reviews?.slice(0, 3).map(r => ({
                content: r.content?.slice(0, 200) + '...',
                rating: r.rating,
                source: r.source
            })),
            benchmarks: gadget.benchmarks?.map(b => ({
                score: b.score,
                context: b.context_json
            }))
        }));
        // Step 3: Generate recommendation using OpenAI
        const systemPrompt = `You are GadgetGuru, an expert AI assistant specializing in gadget recommendations. 
    You have access to comprehensive data including reviews, specifications, and benchmark scores.
    
    Provide detailed, personalized recommendations based on:
    1. User's specific needs and use cases
    2. Budget constraints
    3. Real user reviews and expert opinions
    4. Performance benchmarks
    5. Value for money analysis
    
    Always cite your sources and provide balanced pros/cons analysis.`;
        const userPrompt = `
    User Request: "${prompt}"
    
    ${budget_range ? `Budget: $${budget_range[0]} - $${budget_range[1]}` : ''}
    ${preferred_brands?.length ? `Preferred Brands: ${preferred_brands.join(', ')}` : ''}
    ${use_cases?.length ? `Use Cases: ${use_cases.join(', ')}` : ''}
    
    Available Gadgets Data:
    ${JSON.stringify(context, null, 2)}
    
    Please provide a comprehensive recommendation including:
    1. Summary of the best option(s)
    2. Detailed pros and cons
    3. Score out of 10 with reasoning
    4. Specific sources from reviews/benchmarks
    5. Alternative suggestions if applicable`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1500,
        });
        const aiResponse = completion.choices[0]?.message?.content;
        // Step 4: Parse and structure the AI response
        const recommendationResult = {
            summary: aiResponse?.split('\n')[0] || 'AI recommendation generated',
            pros: [], // Would parse from AI response
            cons: [], // Would parse from AI response
            score: 8.5, // Would extract from AI response
            reasoning: aiResponse || 'No recommendation available',
            sources: relevantGadgets.flatMap((gadget, idx) => [
                {
                    type: 'review',
                    id: gadget.id,
                    excerpt: gadget.reviews?.[0]?.content?.slice(0, 100) + '...' || ''
                }
            ]).slice(0, 5),
            alternatives: relevantGadgets.slice(1, 3).map(gadget => ({
                gadget_id: gadget.id,
                reason: `Alternative option: ${gadget.name}`,
                score: 7.5
            }))
        };
        // Step 5: Save recommendation to database
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
        const response = { data: savedRec };
        res.json(response);
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
    const response = {
        data: data || [],
        total: count || 0,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: (count || 0) > offset + limit,
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
    const response = { data };
    res.json(response);
}));
exports.default = router;
