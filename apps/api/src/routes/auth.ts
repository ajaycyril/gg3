import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabaseClient';
import { ApiResponse, AuthUser } from '@gadgetguru/shared';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import Joi from 'joi';

const router = Router();

// Validation schemas
const signInSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const magicLinkSchema = Joi.object({
  email: Joi.string().email().required(),
  redirectTo: Joi.string().uri().optional(),
});

// POST /api/auth/signin - Email/Password sign in
router.post('/signin', asyncHandler(async (req: Request, res: Response) => {
  const { error: validationError, value } = signInSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: validationError.details[0].message,
      code: 'VALIDATION_ERROR',
    });
  }

  const { email, password } = value;

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logger.warn('Sign in failed:', { email, error: error.message });
    return res.status(401).json({
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS',
    });
  }

  // Create or update user profile
  if (data.user) {
    await supabaseAdmin
      .from('users')
      .upsert({
        auth_id: data.user.id,
        email: data.user.email || '',
        display_name: data.user.user_metadata?.display_name || '',
      }, {
        onConflict: 'auth_id'
      });
  }

  const response: ApiResponse<{ user: AuthUser; session: any }> = {
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
router.post('/signup', asyncHandler(async (req: Request, res: Response) => {
  const { error: validationError, value } = signInSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: validationError.details[0].message,
      code: 'VALIDATION_ERROR',
    });
  }

  const { email, password } = value;

  const { data, error } = await supabaseAdmin.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: email.split('@')[0],
      }
    }
  });

  if (error) {
    logger.warn('Sign up failed:', { email, error: error.message });
    return res.status(400).json({
      error: error.message,
      code: 'SIGNUP_ERROR',
    });
  }

  const response: ApiResponse<{ message: string; user?: AuthUser }> = {
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
router.post('/magic-link', asyncHandler(async (req: Request, res: Response) => {
  const { error: validationError, value } = magicLinkSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: validationError.details[0].message,
      code: 'VALIDATION_ERROR',
    });
  }

  const { email, redirectTo } = value;

  const { error } = await supabaseAdmin.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo || `${process.env.FRONTEND_URL}/auth/callback`,
    },
  });

  if (error) {
    logger.warn('Magic link failed:', { email, error: error.message });
    return res.status(400).json({
      error: 'Failed to send magic link',
      code: 'MAGIC_LINK_ERROR',
    });
  }

  const response: ApiResponse<{ message: string }> = {
    data: {
      message: 'Magic link sent to your email',
    },
  };

  res.json(response);
}));

// POST /api/auth/signout - Sign out
router.post('/signout', asyncHandler(async (req: Request, res: Response) => {
  // For server-side signout, we'll just respond successfully
  // The client should handle clearing the session locally
  const response: ApiResponse<{ message: string }> = {
    data: {
      message: 'Signed out successfully',
    },
  };

  res.json(response);
}));

// GET /api/auth/user - Get current user
router.get('/user', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'No token provided',
      code: 'NO_TOKEN',
    });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }

  const response: ApiResponse<AuthUser> = {
    data: {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    },
  };

  res.json(response);
}));

export default router;