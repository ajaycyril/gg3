import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import logger from '../utils/logger';
import { AppError } from '@gadgetguru/shared';

export interface ErrorWithStatus extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error details
  logger.error('API Error:', {
    message: err.message,
    stack: err.stack,
    status: err.status,
    code: err.code,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    details: err.details,
  });

  // Send error to Sentry in production
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(err, {
      tags: {
        component: 'api',
        endpoint: req.url,
        method: req.method,
      },
      user: {
        ip_address: req.ip,
      },
      extra: {
        details: err.details,
      },
    });
  }

  // Determine error status and message
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500 
    ? 'Internal server error' 
    : err.message;

  // Send error response
  res.status(status).json({
    error: message,
    code: err.code,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack,
      details: err.details 
    }),
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  const message = `Route ${req.method} ${req.originalUrl} not found`;
  
  logger.warn('404 Not Found:', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  res.status(404).json({
    error: message,
    code: 'NOT_FOUND',
  });
};

// Async wrapper to catch promise rejections
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};