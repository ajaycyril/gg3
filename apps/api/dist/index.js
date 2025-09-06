"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const Sentry = __importStar(require("@sentry/node"));
const dotenv_1 = __importDefault(require("dotenv"));
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./middleware/auth");
const logger_1 = __importDefault(require("./utils/logger"));
// Routes
const gadgets_1 = __importDefault(require("./routes/gadgets"));
const auth_2 = __importDefault(require("./routes/auth"));
const recommendations_1 = __importDefault(require("./routes/recommendations"));
const users_1 = __importDefault(require("./routes/users"));
const feedback_1 = __importDefault(require("./routes/feedback"));
const health_1 = __importDefault(require("./routes/health"));
// Load environment variables
dotenv_1.default.config();
// Initialize Sentry for error tracking
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
}
const app = (0, express_1.default)();
const port = process.env.PORT || 3002;
// Security middleware
app.use((0, helmet_1.default)({
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
const limiter = (0, express_rate_limit_1.default)({
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
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('combined', {
        stream: { write: (message) => logger_1.default.info(message.trim()) }
    }));
}
// Health check (before auth)
app.use('/health', health_1.default);
// Authentication middleware for protected routes
app.use('/api/recommendations', auth_1.authMiddleware);
app.use('/api/users', auth_1.authMiddleware);
app.use('/api/feedback', auth_1.authMiddleware);
// API Routes
app.use('/api/auth', auth_2.default);
app.use('/api/gadgets', gadgets_1.default);
app.use('/api/recommendations', recommendations_1.default);
app.use('/api/users', users_1.default);
app.use('/api/feedback', feedback_1.default);
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
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
// Graceful shutdown
const server = app.listen(port, () => {
    logger_1.default.info(`🚀 GadgetGuru API server running on port ${port}`);
    logger_1.default.info(`📚 API Documentation: http://localhost:${port}/docs`);
    logger_1.default.info(`🏥 Health Check: http://localhost:${port}/health`);
});
process.on('SIGTERM', () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger_1.default.info('Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger_1.default.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger_1.default.info('Server closed');
        process.exit(0);
    });
});
exports.default = app;
