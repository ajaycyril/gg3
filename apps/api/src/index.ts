import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Import shared types
import { AppError } from '@gadgetguru/shared';

// Import middleware and routes
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { tenantMiddleware } from './middleware/tenant';
import authRoutes from './routes/auth';
import gadgetRoutes from './routes/gadgets';
import recommendationRoutes from './routes/recommendations';
import userRoutes from './routes/users';
import feedbackRoutes from './routes/feedback';
import healthRoutes from './routes/health';
import dynamicAiRoutes from './routes/dynamic-ai';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is required');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Supabase configuration is required');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

const app: Express = express();
const port = process.env.PORT || 3002;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy in production
if (isProduction) {
  app.set('trust proxy', 1);
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
    },
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 1000,
  message: { error: 'Too many requests, please try again later' }
});
app.use(limiter);

// Compression and CORS
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'user-id']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message: string) => logger.info(message.trim()) }
  }));
}

// Health endpoint (always public)
app.use('/api/health', healthRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '🚀 GadgetGuru AI API',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    health: '/api/health'
  });
});

// Public routes (no tenant middleware)
app.use('/api/auth', authRoutes);
app.use('/api/ai', dynamicAiRoutes);  // AI endpoints remain public
app.use('/api/gadgets', gadgetRoutes);  // Make gadgets public for basic browsing

// Protected routes with tenant middleware (for monetization)
app.use('/api/recommendations', tenantMiddleware, recommendationRoutes);
app.use('/api/users', tenantMiddleware, userRoutes);
app.use('/api/feedback', tenantMiddleware, feedbackRoutes);

// Error handlers
app.use(errorHandler);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Start server
const server = app.listen(port, () => {
  logger.info(`🚀 GadgetGuru AI API running on port ${port}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
