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

// Initialize Sentry for error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

const app: Application = express();
const port = process.env.PORT || 3002;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing and compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
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
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Health check (before auth)
app.use('/health', healthRoutes);

// Authentication middleware for protected routes
app.use('/api/recommendations', authMiddleware);
app.use('/api/users', authMiddleware);
app.use('/api/feedback', authMiddleware);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/gadgets', gadgetsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/feedback', feedbackRoutes);

// API documentation redirect
app.get('/docs', (req, res) => {
  res.redirect('/api/docs');
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'GadgetGuru API Server',
    version: '1.0.0',
    status: 'healthy',
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

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const server = app.listen(port, () => {
  logger.info(`🚀 GadgetGuru API server running on port ${port}`);
  logger.info(`📚 API Documentation: http://localhost:${port}/docs`);
  logger.info(`🏥 Health Check: http://localhost:${port}/health`);
});

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