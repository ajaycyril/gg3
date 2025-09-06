import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabaseClient';
import { Feedback, ApiResponse, PaginatedResponse } from '@gadgetguru/shared';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import Joi from 'joi';

const router = Router();

// Validation schemas
const feedbackSchema = Joi.object({
  recommendation_id: Joi.string().uuid().optional(),
  text: Joi.string().max(2000).optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
});

// POST /api/feedback - Submit feedback
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error: validationError, value } = feedbackSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: validationError.details[0].message,
      code: 'VALIDATION_ERROR',
    });
  }

  const { recommendation_id, text, rating } = value;
  const userId = req.user!.id;

  // Validate that either text or rating is provided
  if (!text && !rating) {
    return res.status(400).json({
      error: 'Either text or rating must be provided',
      code: 'VALIDATION_ERROR',
    });
  }

  // If recommendation_id is provided, verify it belongs to the user
  if (recommendation_id) {
    const { data: recommendation, error: recError } = await supabase
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

  const { data, error } = await supabase
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
    logger.error('Failed to create feedback:', error);
    return res.status(500).json({
      error: 'Failed to submit feedback',
      code: 'DATABASE_ERROR',
    });
  }

  logger.info('Feedback submitted:', { 
    id: data.id, 
    userId, 
    recommendationId: recommendation_id,
    hasText: !!text,
    rating
  });

  const response: ApiResponse<Feedback> = { data };
  res.status(201).json(response);
}));

// GET /api/feedback - Get user's feedback
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const offset = parseInt(req.query.offset as string) || 0;

  const { data, error, count } = await supabase
    .from('feedback')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('Failed to fetch feedback:', error);
    return res.status(500).json({
      error: 'Failed to fetch feedback',
      code: 'DATABASE_ERROR',
    });
  }

  const response: PaginatedResponse<Feedback> = {
    data: data || [],
    total: count || 0,
    page: Math.floor(offset / limit) + 1,
    limit,
    hasMore: (count || 0) > offset + limit,
  };

  res.json(response);
}));

// PUT /api/feedback/:id - Update feedback
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  const { error: validationError, value } = feedbackSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: validationError.details[0].message,
      code: 'VALIDATION_ERROR',
    });
  }

  const { text, rating } = value;

  const { data, error } = await supabase
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
    
    logger.error('Failed to update feedback:', error);
    return res.status(500).json({
      error: 'Failed to update feedback',
      code: 'DATABASE_ERROR',
    });
  }

  logger.info('Feedback updated:', { id, userId });

  const response: ApiResponse<Feedback> = { data };
  res.json(response);
}));

// DELETE /api/feedback/:id - Delete feedback
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const { error } = await supabase
    .from('feedback')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    logger.error('Failed to delete feedback:', error);
    return res.status(500).json({
      error: 'Failed to delete feedback',
      code: 'DATABASE_ERROR',
    });
  }

  logger.info('Feedback deleted:', { id, userId });

  res.status(204).send();
}));

export default router;