import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabaseClient';
import { User, UserPreferences, ApiResponse } from '@gadgetguru/shared';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import Joi from 'joi';

const router = Router();

// Validation schemas
const preferencesSchema = Joi.object({
  budget_range: Joi.array().items(Joi.number()).length(2).optional(),
  preferred_brands: Joi.array().items(Joi.string()).optional(),
  use_cases: Joi.array().items(Joi.string()).optional(),
  experience_level: Joi.string().valid('beginner', 'intermediate', 'expert').optional(),
  notifications_enabled: Joi.boolean().optional(),
  saved_searches: Joi.array().items(Joi.string()).optional(),
  saved_gadgets: Joi.array().items(Joi.string().uuid()).optional(),
});

const profileSchema = Joi.object({
  display_name: Joi.string().max(100).optional(),
  preferences: preferencesSchema.optional(),
});

// GET /api/users/profile - Get current user profile
router.get('/profile', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.error('Failed to fetch user profile:', error);
    return res.status(500).json({
      error: 'Failed to fetch profile',
      code: 'DATABASE_ERROR',
    });
  }

  // Create profile if doesn't exist
  if (!data) {
    const { data: newProfile, error: createError } = await supabase
      .from('users')
      .insert({
        auth_id: userId,
        email: req.user!.email,
        display_name: req.user!.user_metadata?.display_name,
        preferences: {}
      })
      .select()
      .single();

    if (createError) {
      logger.error('Failed to create user profile:', createError);
      return res.status(500).json({
        error: 'Failed to create profile',
        code: 'DATABASE_ERROR',
      });
    }

    const response: ApiResponse<User> = { data: newProfile };
    return res.json(response);
  }

  const response: ApiResponse<User> = { data };
  res.json(response);
}));

// PUT /api/users/profile - Update user profile
router.put('/profile', asyncHandler(async (req: Request, res: Response) => {
  const { error: validationError, value } = profileSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: validationError.details[0].message,
      code: 'VALIDATION_ERROR',
    });
  }

  const userId = req.user!.id;
  const { display_name, preferences } = value;

  const { data, error } = await supabase
    .from('users')
    .update({
      ...(display_name && { display_name }),
      ...(preferences && { preferences })
    })
    .eq('auth_id', userId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update user profile:', error);
    return res.status(500).json({
      error: 'Failed to update profile',
      code: 'DATABASE_ERROR',
    });
  }

  logger.info('User profile updated:', { userId, updates: Object.keys(value) });

  const response: ApiResponse<User> = { data };
  res.json(response);
}));

// GET /api/users/preferences - Get user preferences
router.get('/preferences', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const { data, error } = await supabase
    .from('users')
    .select('preferences')
    .eq('auth_id', userId)
    .single();

  if (error) {
    logger.error('Failed to fetch user preferences:', error);
    return res.status(500).json({
      error: 'Failed to fetch preferences',
      code: 'DATABASE_ERROR',
    });
  }

  const response: ApiResponse<UserPreferences> = { 
    data: data?.preferences || {} 
  };
  res.json(response);
}));

// PUT /api/users/preferences - Update user preferences
router.put('/preferences', asyncHandler(async (req: Request, res: Response) => {
  const { error: validationError, value } = preferencesSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: validationError.details[0].message,
      code: 'VALIDATION_ERROR',
    });
  }

  const userId = req.user!.id;

  const { data, error } = await supabase
    .from('users')
    .update({ preferences: value })
    .eq('auth_id', userId)
    .select('preferences')
    .single();

  if (error) {
    logger.error('Failed to update user preferences:', error);
    return res.status(500).json({
      error: 'Failed to update preferences',
      code: 'DATABASE_ERROR',
    });
  }

  logger.info('User preferences updated:', { userId });

  const response: ApiResponse<UserPreferences> = { 
    data: data.preferences 
  };
  res.json(response);
}));

// POST /api/users/save-gadget - Save/unsave a gadget
router.post('/save-gadget', asyncHandler(async (req: Request, res: Response) => {
  const { gadget_id, action } = req.body;
  
  if (!gadget_id || !['save', 'unsave'].includes(action)) {
    return res.status(400).json({
      error: 'Invalid gadget_id or action',
      code: 'VALIDATION_ERROR',
    });
  }

  const userId = req.user!.id;

  // Get current preferences
  const { data: userData, error: fetchError } = await supabase
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

  const preferences = (userData?.preferences as UserPreferences) || {};
  const savedGadgets = new Set(preferences.saved_gadgets || []);

  if (action === 'save') {
    savedGadgets.add(gadget_id);
  } else {
    savedGadgets.delete(gadget_id);
  }

  const updatedPreferences = {
    ...preferences,
    saved_gadgets: Array.from(savedGadgets)
  };

  const { error: updateError } = await supabase
    .from('users')
    .update({ preferences: updatedPreferences })
    .eq('auth_id', userId);

  if (updateError) {
    return res.status(500).json({
      error: 'Failed to update saved gadgets',
      code: 'DATABASE_ERROR',
    });
  }

  const response: ApiResponse<{ message: string; saved_gadgets: string[] }> = {
    data: {
      message: `Gadget ${action}d successfully`,
      saved_gadgets: Array.from(savedGadgets)
    }
  };

  res.json(response);
}));

export default router;