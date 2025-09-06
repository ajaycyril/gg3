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
exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const Sentry = __importStar(require("@sentry/node"));
const logger_1 = __importDefault(require("../utils/logger"));
const errorHandler = (err, req, res, next) => {
    // Log error details
    logger_1.default.error('API Error:', {
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
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    const message = `Route ${req.method} ${req.originalUrl} not found`;
    logger_1.default.warn('404 Not Found:', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
    });
    res.status(404).json({
        error: message,
        code: 'NOT_FOUND',
    });
};
exports.notFoundHandler = notFoundHandler;
// Async wrapper to catch promise rejections
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
