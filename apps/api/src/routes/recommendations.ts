import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabaseClient';
import { 
  Recommendation, 
  RecommendationResult, 
  ApiResponse, 
  PaginatedResponse 
} from '@gadgetguru/shared';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import Joi from 'joi';

const router = Router();

// Validation schemas
const recommendationSchema = Joi.object({
  prompt: Joi.string().required().min(10).max(1000),
  gadget_id: Joi.string().uuid().optional(),
  budget_range: Joi.array().items(Joi.number()).length(2).optional(),
  preferred_brands: Joi.array().items(Joi.string()).optional(),
  use_cases: Joi.array().items(Joi.string()).optional(),
});

// POST /api/recommendations - Generate AI-powered recommendation
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error: validationError, value } = recommendationSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: validationError.details[0].message,
      code: 'VALIDATION_ERROR',
    });
  }

  const { prompt, gadget_id, budget_range, preferred_brands, use_cases } = value;
  const userId = req.user!.id;

  try {
    // Get user profile for personalization
    const { data: userProfile } = await supabase
      .from('users')
      .select('preferences')
      .eq('auth_id', userId)
      .single();

    // Step 1: Search for relevant gadgets based on budget and brands
    let relevantGadgets = [];
    if (gadget_id) {
      // Get specific gadget with reviews
      const { data } = await supabase
        .from('gadgets')
        .select(`
          *,
          reviews:reviews(*),
          specs_normalized:specs_normalized(*),
          benchmarks:benchmarks(*)
        `)
        .eq('id', gadget_id)
        .single();
      
      if (data) relevantGadgets = [data];
    } else {
      // Search for relevant gadgets based on budget and brands
      let query = supabase
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
    const recommendationResult: RecommendationResult = {
      summary: `Based on your request: "${prompt}", here are the best options from ${relevantGadgets.length} gadgets found.`,
      pros: [
        'Great value for money',
        'Excellent user reviews',
        'Meets your requirements'
      ],
      cons: [
        'Limited availability',
        'Higher price point'
      ],
      score: 8.5,
      reasoning: `After analyzing ${relevantGadgets.length} gadgets matching your criteria, these recommendations provide the best balance of features, price, and user satisfaction.`,
      sources: relevantGadgets.flatMap((gadget, idx) => [
        {
          type: 'review' as const,
          id: gadget.id,
          excerpt: gadget.reviews?.[0]?.content?.slice(0, 100) + '...' || 'No reviews available'
        }
      ]).slice(0, 5),
      alternatives: relevantGadgets.slice(1, 3).map(gadget => ({
        gadget_id: gadget.id,
        reason: `Alternative option: ${gadget.name}`,
        score: 7.5
      }))
    };

    // Step 3: Save recommendation to database
    const { data: savedRec, error: saveError } = await supabase
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
      logger.error('Failed to save recommendation:', saveError);
      return res.status(500).json({
        error: 'Failed to save recommendation',
        code: 'DATABASE_ERROR',
      });
    }

    logger.info('Recommendation generated:', { 
      id: savedRec.id, 
      userId, 
      gadgetId: gadget_id,
      promptLength: prompt.length 
    });

    const response: ApiResponse<Recommendation> = { data: savedRec };
    res.json(response);

  } catch (error) {
    logger.error('Recommendation generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate recommendation',
      code: 'AI_ERROR',
    });
  }
}));

// GET /api/recommendations - Get user's recommendations
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const offset = parseInt(req.query.offset as string) || 0;

  const { data, error, count } = await supabase
    .from('recommendations')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('Failed to fetch recommendations:', error);
    return res.status(500).json({
      error: 'Failed to fetch recommendations',
      code: 'DATABASE_ERROR',
    });
  }

  const response: PaginatedResponse<Recommendation> = {
    data: data || [],
    total: count || 0,
    page: Math.floor(offset / limit) + 1,
    limit,
    hasMore: (count || 0) > offset + limit,
  };

  res.json(response);
}));

// GET /api/recommendations/:id - Get specific recommendation
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const { data, error } = await supabase
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

  const response: ApiResponse<Recommendation> = { data };
  res.json(response);
}));

export default router;