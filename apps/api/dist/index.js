"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Import middleware and routes
const logger_1 = __importDefault(require("./utils/logger"));
const errorHandler_1 = require("./middleware/errorHandler");
const tenant_1 = require("./middleware/tenant");
const auth_1 = __importDefault(require("./routes/auth"));
const gadgets_1 = __importDefault(require("./routes/gadgets"));
const recommendations_1 = __importDefault(require("./routes/recommendations"));
const users_1 = __importDefault(require("./routes/users"));
const feedback_1 = __importDefault(require("./routes/feedback"));
const health_1 = __importDefault(require("./routes/health"));
const dynamic_ai_1 = __importDefault(require("./routes/dynamic-ai"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
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
const app = (0, express_1.default)();
const port = process.env.PORT || 3002;
const isProduction = process.env.NODE_ENV === 'production';
// Trust proxy in production
if (isProduction) {
    app.set('trust proxy', 1);
}
// Security headers
app.use((0, helmet_1.default)({
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
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 100 : 1000,
    message: { error: 'Too many requests, please try again later' }
});
app.use(limiter);
// Compression and CORS
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'user-id']
}));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging
if (process.env.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('combined', {
        stream: { write: (message) => logger_1.default.info(message.trim()) }
    }));
}
// Health endpoint (always public)
app.use('/api/health', health_1.default);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: '🚀 GadgetGuru AI API',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        health: '/api/health'
    });
});
// Public routes (no tenant middleware)
app.use('/api/auth', auth_1.default);
app.use('/api/ai', dynamic_ai_1.default); // AI endpoints remain public
app.use('/api/gadgets', gadgets_1.default); // Make gadgets public for basic browsing
// Protected routes with tenant middleware (for monetization)
app.use('/api/recommendations', tenant_1.tenantMiddleware, recommendations_1.default);
app.use('/api/users', tenant_1.tenantMiddleware, users_1.default);
app.use('/api/feedback', tenant_1.tenantMiddleware, feedback_1.default);
// Error handlers
app.use(errorHandler_1.errorHandler);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});
// Start server in traditional mode only when not on Vercel serverless
let server;
if (!process.env.VERCEL) {
    server = app.listen(port, () => {
        logger_1.default.info(`🚀 GadgetGuru AI API running on port ${port}`);
        logger_1.default.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}
// Graceful shutdown (only when server is running)
if (server) {
    const shutdown = () => {
        logger_1.default.info('Shutting down gracefully...');
        server.close(() => {
            logger_1.default.info('Server closed');
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
exports.default = app;
