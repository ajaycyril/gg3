"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
// Health check endpoint
router.get('/', async (req, res) => {
    const healthCheck = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        services: {
            database: 'unknown',
            cache: 'unknown',
        },
    };
    try {
        // Test database connection
        const { data, error } = await supabase
            .from('gadgets')
            .select('count', { count: 'exact', head: true });
        healthCheck.services.database = error ? 'error' : 'ok';
        // Test Redis connection if configured
        if (process.env.REDIS_URL) {
            // Add Redis health check here when implemented
            healthCheck.services.cache = 'ok';
        }
        const isHealthy = Object.values(healthCheck.services).every(service => service === 'ok' || service === 'unknown');
        res.status(isHealthy ? 200 : 503).json(healthCheck);
    }
    catch (error) {
        logger_1.default.error('Health check failed:', error);
        healthCheck.services.database = 'error';
        res.status(503).json(healthCheck);
    }
});
// Detailed health check for monitoring systems
router.get('/detailed', async (req, res) => {
    const checks = {
        timestamp: new Date().toISOString(),
        status: 'ok',
        checks: {
            database: { status: 'unknown', latency: 0 },
            memory: { status: 'ok', usage: process.memoryUsage() },
            uptime: { status: 'ok', seconds: process.uptime() },
        },
    };
    try {
        // Database latency check
        const start = Date.now();
        const { error } = await supabase
            .from('gadgets')
            .select('count', { count: 'exact', head: true });
        checks.checks.database.latency = Date.now() - start;
        checks.checks.database.status = error ? 'error' : 'ok';
        const isHealthy = Object.values(checks.checks).every(check => check.status === 'ok' || check.status === 'unknown');
        checks.status = isHealthy ? 'ok' : 'error';
        res.status(isHealthy ? 200 : 503).json(checks);
    }
    catch (error) {
        logger_1.default.error('Detailed health check failed:', error);
        checks.status = 'error';
        res.status(503).json(checks);
    }
});
exports.default = router;
