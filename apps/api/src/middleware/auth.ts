import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../db/supabaseClient';
import { AuthUser } from '@gadgetguru/shared';
import logger from '../utils/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization token required',
        code: 'UNAUTHORIZED',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      logger.warn('Auth failed:', { error: error?.message, token: token.slice(0, 20) + '...' });
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'UNAUTHORIZED',
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
};

// Optional auth - doesn't fail if no token provided
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
        };
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // Continue even if auth fails
  }
};