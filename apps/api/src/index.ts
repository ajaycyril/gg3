import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables with explicit path
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import logger from './utils/logger';

// Routes
import gadgetsRoutes from './routes/gadgets';
import authRoutes from './routes/auth';
import recommendationsRoutes from './routes/recommendations';
import usersRoutes from './routes/users';
import feedbackRoutes from './routes/feedback';
import healthRoutes from './routes/health';
import dynamicAIRoutes from './routes/dynamic-ai';

// Initialize Sentry for V0 deployment
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // V0 serverless optimizations
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: undefined }), // Will set app later
    ],
    beforeSend(event) {
      // Filter out noisy serverless events
      if (event.exception?.values?.[0]?.value?.includes('SIGTERM')) {
        return null;
      }
      return event;
    }
  });
}

const app: Application = express();
const port = process.env.PORT || 3002;

// V0 serverless optimizations - minimize middleware for cold starts
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

// V0-optimized security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://*.vercel.app"]
    },
  },
  crossOriginEmbedderPolicy: false, // V0 compatibility
}));

// V0-optimized rate limiting with memory store for serverless
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? (isVercel ? 200 : 100) : 1000, // Higher limit for V0
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // V0 serverless optimization
  skip: (req) => {
    // Skip rate limiting for health checks in serverless
    return req.path.startsWith('/health');
  },
  keyGenerator: (req) => {
    // Use x-forwarded-for for V0 deployment
    return req.headers['x-forwarded-for'] as string || req.ip;
  }
});

app.use(limiter);

// V0-optimized body parsing with smaller limits for serverless
app.use(express.json({ 
  limit: isVercel ? '1mb' : '10mb' // Smaller limit for V0
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: isVercel ? '1mb' : '10mb' 
}));

// V0-optimized compression
app.use(compression({
  level: isVercel ? 1 : 6, // Lower compression for faster cold starts
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// V0-optimized CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // V0 specific origins
    const v0Origins = [
      /https:\/\/.*\.vercel\.app$/,
      /https:\/\/.*\.v0\.dev$/,
      /https:\/\/gadgetguru.*\.vercel\.app$/
    ];
    
    // Check V0 patterns first
    for (const pattern of v0Origins) {
      if (pattern.test(origin)) {
        return callback(null, true);
      }
    }
    
    // Allow localhost on any port for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
      return callback(null, true);
    }
    
    // Allow configured origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-vercel-id'],
}));

// V0-optimized logging - disable in serverless production
if (!isVercel && process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Sentry request handler for V0
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Health check (before auth) - optimized for V0
app.use('/health', healthRoutes);

// V0 serverless function optimization - lazy load auth middleware
app.use('/api/recommendations', (req, res, next) => {
  // Only apply auth middleware for non-OPTIONS requests
  if (req.method === 'OPTIONS') return next();
  return authMiddleware(req, res, next);
});
app.use('/api/users', (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  return authMiddleware(req, res, next);
});
app.use('/api/feedback', (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  return authMiddleware(req, res, next);
});

// API Routes - organized for V0 performance
app.use('/api/auth', authRoutes);
app.use('/api/gadgets', gadgetsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/ai', dynamicAIRoutes); // Dynamic AI endpoints

// V0-optimized API documentation
app.get('/docs', (req, res) => {
  res.json({
    message: 'GadgetGuru API Documentation',
    version: '1.0.0',
    deployed_on: 'Vercel V0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      gadgets: '/api/gadgets',
      recommendations: '/api/recommendations',
      users: '/api/users',
      feedback: '/api/feedback',
    },
    v0_optimizations: [
      'Serverless connection pooling',
      'Edge runtime compatibility',
      'Automatic retries with circuit breaker',
      'Memory-optimized pagination',
      'V0-specific CORS patterns'
    ]
  });
});

// Root endpoint optimized for V0
app.get('/', (req, res) => {
  res.json({
    message: 'GadgetGuru API Server',
    version: '1.0.0',
    status: 'healthy',
    deployment: isVercel ? 'Vercel V0 Serverless' : 'Development',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      docs: '/docs',
      auth: '/api/auth',
      gadgets: '/api/gadgets',
      recommendations: '/api/recommendations',
      users: '/api/users',
      feedback: '/api/feedback',
    },
  });
});

// Sentry error handler for V0 (must be before other error handlers)
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Only send 5xx errors to Sentry in production
      return error.status >= 500;
    }
  }));
}

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// V0 serverless export (no server listen in serverless)
if (isVercel) {
  // Export for Vercel serverless functions
  export default app;
} else {
  // Traditional server for development
  const server = app.listen(port, () => {
    logger.info(`🚀 GadgetGuru API server running on port ${port}`);
    logger.info(`📚 API Documentation: http://localhost:${port}/docs`);
    logger.info(`🏥 Health Check: http://localhost:${port}/health`);
    logger.info(`🎯 Deployment: ${isVercel ? 'V0 Serverless' : 'Development'}`);
  });

  // Graceful shutdown for development
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  export default app;
}