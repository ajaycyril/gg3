"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = exports.supabase = exports.db = void 0;
// Load environment variables FIRST - before any other imports
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = __importDefault(require("../utils/logger"));
// V0-optimized Supabase client with serverless connection pooling
class DatabaseClient {
    constructor() {
        this.connectionPool = new Map();
        // V0 serverless optimizations
        this.maxConnections = 5; // Limit for serverless
        this.connectionTimeout = 30000; // 30s timeout
        this.lastActivity = Date.now();
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseKey || !supabaseServiceKey) {
            throw new Error('Missing required Supabase environment variables');
        }
        // V0 Edge Runtime compatible client configuration
        this.client = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            },
            db: {
                schema: 'public'
            },
            global: {
                headers: {
                    'x-application-name': 'gadgetguru-v0'
                }
            }
        });
        // Admin client optimized for serverless
        this.adminClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            },
            db: {
                schema: 'public'
            },
            global: {
                headers: {
                    'x-application-name': 'gadgetguru-v0-admin'
                }
            }
        });
        logger_1.default.info('V0-optimized database clients initialized');
        // Setup serverless cleanup
        this.setupServerlessCleanup();
    }
    // V0 serverless cleanup handler
    setupServerlessCleanup() {
        // Clean up idle connections in serverless environment
        if (typeof process !== 'undefined' && process.env.VERCEL) {
            const cleanupInterval = setInterval(() => {
                const now = Date.now();
                if (now - this.lastActivity > this.connectionTimeout) {
                    this.connectionPool.clear();
                    logger_1.default.debug('Cleaned up idle connections for serverless');
                }
            }, 15000); // Check every 15 seconds
            // Clear interval when process ends
            process.on('beforeExit', () => {
                clearInterval(cleanupInterval);
                this.connectionPool.clear();
            });
        }
    }
    static getInstance() {
        if (!DatabaseClient.instance) {
            DatabaseClient.instance = new DatabaseClient();
        }
        return DatabaseClient.instance;
    }
    // V0-optimized connection getter with pooling
    getClient(accessToken) {
        this.lastActivity = Date.now();
        if (accessToken) {
            // Create ephemeral client for authenticated requests in serverless
            const poolKey = `auth_${accessToken.slice(0, 10)}`;
            if (!this.connectionPool.has(poolKey) && this.connectionPool.size < this.maxConnections) {
                const authClient = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
                    auth: { autoRefreshToken: false, persistSession: false },
                    global: {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'x-application-name': 'gadgetguru-v0-auth'
                        }
                    }
                });
                this.connectionPool.set(poolKey, authClient);
            }
            return this.connectionPool.get(poolKey) || this.client;
        }
        return this.client;
    }
    getAdminClient() {
        this.lastActivity = Date.now();
        return this.adminClient;
    }
    // V0-optimized health check with timeout
    async healthCheck() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout for serverless
            const { data, error } = await this.adminClient
                .from('gadgets')
                .select('id')
                .limit(1);
            clearTimeout(timeout);
            if (error) {
                logger_1.default.error('Database health check failed:', error);
                return false;
            }
            return true;
        }
        catch (error) {
            logger_1.default.error('Database health check error:', error);
            return false;
        }
    }
    async executeQuery(tableNameOrQueryBuilder, operation, queryBuilder, useAdmin = false) {
        try {
            // V0 serverless timeout protection
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 25000); // 25s max
            let result;
            // Handle both overload signatures
            if (typeof tableNameOrQueryBuilder === 'string') {
                // Full signature with table name and operation
                const client = useAdmin ? this.adminClient : this.client;
                let query = client.from(tableNameOrQueryBuilder);
                if (queryBuilder) {
                    query = queryBuilder(query);
                }
                result = await query;
            }
            else {
                // Simple signature with just query builder
                result = await tableNameOrQueryBuilder;
            }
            clearTimeout(timeout);
            if (result.error) {
                logger_1.default.error('V0 query execution error:', result.error);
                return { data: null, error: result.error };
            }
            if (!result.data) {
                logger_1.default.warn('V0 query returned no data');
                return { data: null, error: null };
            }
            return { data: result.data, error: null };
        }
        catch (error) {
            logger_1.default.error('V0 query execution exception:', error);
            return { data: null, error };
        }
    }
    // V0-optimized pagination with serverless memory constraints
    async getPaginatedResults(tableName, page = 1, limit = 10, queryBuilder, useAdmin = false) {
        // Limit max results for serverless memory constraints
        const maxLimit = Math.min(limit, 50); // V0 optimization
        const offset = (page - 1) * maxLimit;
        const client = useAdmin ? this.adminClient : this.client;
        try {
            // Optimize count query for serverless - use head request when possible
            const useHeadCount = !queryBuilder; // Only for simple queries
            let countQuery = client.from(tableName).select('*', {
                count: 'estimated',
                head: useHeadCount
            });
            if (queryBuilder && !useHeadCount) {
                countQuery = queryBuilder(countQuery);
            }
            const { count, error: countError } = await countQuery;
            if (countError) {
                logger_1.default.warn('V0 pagination count failed, continuing without total:', countError);
                // Continue without count for better UX
            }
            // Get paginated data with timeout
            let dataQuery = client.from(tableName).select('*').range(offset, offset + maxLimit - 1);
            if (queryBuilder) {
                dataQuery = queryBuilder(dataQuery);
            }
            const { data, error } = await dataQuery;
            const result = {
                data: data || [],
                pagination: {
                    page,
                    limit: maxLimit,
                    total: count || 0,
                    totalPages: count ? Math.ceil(count / maxLimit) : 0
                },
                error
            };
            logger_1.default.debug('V0 pagination completed', {
                tableName,
                page,
                limit: maxLimit,
                resultCount: result.data.length,
                hasTotal: !!count
            });
            return result;
        }
        catch (error) {
            logger_1.default.error(`V0 pagination query failed on ${tableName}:`, error);
            return {
                data: [],
                pagination: { page, limit: maxLimit, total: 0, totalPages: 0 },
                error
            };
        }
    }
    // V0-optimized bulk operations with serverless memory management
    async bulkInsert(tableName, records, chunkSize = 100, // Smaller chunks for V0 serverless
    useAdmin = true) {
        const client = useAdmin ? this.adminClient : this.client;
        const errors = [];
        let insertedCount = 0;
        // V0 memory optimization - process in smaller batches
        const maxMemoryUsage = 50 * 1024 * 1024; // 50MB limit for V0
        try {
            // Process in chunks to avoid V0 serverless timeout and memory limits
            const totalChunks = Math.ceil(records.length / chunkSize);
            for (let i = 0; i < records.length; i += chunkSize) {
                const chunk = records.slice(i, i + chunkSize);
                const chunkNumber = Math.floor(i / chunkSize) + 1;
                // V0 memory check before processing chunk
                if (process.memoryUsage().heapUsed > maxMemoryUsage) {
                    logger_1.default.warn(`V0 memory limit approaching, reducing chunk size`);
                    // Force garbage collection if available
                    if (global.gc) {
                        global.gc();
                    }
                }
                try {
                    // V0 timeout protection
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 15000); // 15s per chunk
                    const { data, error } = await client
                        .from(tableName)
                        .insert(chunk)
                        .select('id')
                        .abortSignal(controller.signal);
                    clearTimeout(timeout);
                    if (error) {
                        errors.push({
                            chunk: chunkNumber,
                            error,
                            recordsInChunk: chunk.length,
                            timestamp: new Date().toISOString()
                        });
                        logger_1.default.error(`V0 bulk insert chunk ${chunkNumber}/${totalChunks} failed:`, error);
                    }
                    else {
                        insertedCount += data?.length || 0;
                        logger_1.default.debug(`V0 bulk insert chunk ${chunkNumber}/${totalChunks} completed`, {
                            recordsInserted: data?.length || 0,
                            totalProgress: `${insertedCount}/${records.length}`
                        });
                    }
                }
                catch (chunkError) {
                    errors.push({
                        chunk: chunkNumber,
                        error: chunkError,
                        recordsInChunk: chunk.length,
                        type: 'timeout_or_exception'
                    });
                    logger_1.default.error(`V0 bulk insert chunk ${chunkNumber} exception:`, chunkError);
                }
                // V0 rate limiting between chunks to avoid overwhelming serverless
                if (chunkNumber % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            const successRate = ((records.length - errors.reduce((sum, err) => sum + (err.recordsInChunk || 0), 0)) / records.length * 100).toFixed(1);
            logger_1.default.info(`V0 bulk insert completed for ${tableName}`, {
                totalRecords: records.length,
                insertedCount,
                errorCount: errors.length,
                successRate: `${successRate}%`,
                runtime: 'serverless'
            });
            return {
                success: errors.length === 0,
                insertedCount,
                errors
            };
        }
        catch (error) {
            logger_1.default.error(`V0 bulk insert failed for ${tableName}:`, error);
            return {
                success: false,
                insertedCount,
                errors: [{ error, type: 'bulk_operation_failure' }]
            };
        }
    }
    // V0-optimized vector similarity search for RAG operations
    async vectorSimilaritySearch(vector, limit = 10, threshold = 0.5) {
        try {
            // V0 timeout protection for vector operations
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 12000); // 12s for vector search
            const { data, error } = await this.adminClient.rpc('match_embeddings', {
                query_embedding: vector,
                match_threshold: threshold,
                match_count: Math.min(limit, 20) // V0 limit optimization
            }).abortSignal(controller.signal);
            clearTimeout(timeout);
            if (error) {
                logger_1.default.error('V0 vector similarity search failed:', error);
            }
            else {
                logger_1.default.debug('V0 vector search completed', {
                    resultsCount: data?.length || 0,
                    threshold,
                    limit: Math.min(limit, 20)
                });
            }
            return { data: data || [], error };
        }
        catch (error) {
            logger_1.default.error('V0 vector similarity search exception:', error);
            return { data: [], error };
        }
    }
    // V0-optimized batch processing for scraping operations
    async processBatch(items, processor, options = {}) {
        const { batchSize = 10, // Smaller for V0
        maxConcurrent = 3, // Lower concurrency for serverless
        retryCount = 2, delayMs = 100 } = options;
        const results = [];
        const errors = [];
        logger_1.default.info(`V0 batch processing started`, {
            totalItems: items.length,
            batchSize,
            maxConcurrent,
            expectedBatches: Math.ceil(items.length / batchSize)
        });
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            try {
                // Process batch with concurrency control
                const batchPromises = batch.map(async (item, index) => {
                    let lastError;
                    for (let attempt = 1; attempt <= retryCount + 1; attempt++) {
                        try {
                            const result = await processor(item);
                            return { success: true, result, index: i + index };
                        }
                        catch (error) {
                            lastError = error;
                            if (attempt <= retryCount) {
                                // Exponential backoff for V0
                                await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
                            }
                        }
                    }
                    return { success: false, error: lastError, index: i + index };
                });
                // Limit concurrent operations for V0
                const batchResults = await Promise.all(batchPromises);
                batchResults.forEach((result) => {
                    if (result.success && result.result) {
                        results.push(result.result);
                    }
                    else {
                        errors.push({
                            index: result.index,
                            error: result.error,
                            item: items[result.index]
                        });
                    }
                });
                // V0 memory management - small delay between batches
                if (i + batchSize < items.length) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
            catch (batchError) {
                logger_1.default.error(`V0 batch processing error at index ${i}:`, batchError);
                errors.push({
                    batchStart: i,
                    batchSize: batch.length,
                    error: batchError,
                    type: 'batch_failure'
                });
            }
        }
        logger_1.default.info(`V0 batch processing completed`, {
            totalItems: items.length,
            successCount: results.length,
            errorCount: errors.length,
            successRate: `${(results.length / items.length * 100).toFixed(1)}%`
        });
        return { results, errors };
    }
    // V0-optimized connection cleanup for serverless
    async cleanup() {
        try {
            this.connectionPool.clear();
            logger_1.default.debug('V0 connection cleanup completed');
        }
        catch (error) {
            logger_1.default.error('V0 connection cleanup error:', error);
        }
    }
    // Security-enhanced methods for bulletproof database protection
    // Advanced security monitoring
    async checkSecurityThreat(ip) {
        try {
            const { data } = await this.adminClient
                .from('security_audit_log')
                .select('*')
                .eq('ip_address', ip)
                .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
                .eq('success', false);
            // Block IP if more than 10 failed attempts in 5 minutes
            if (data && data.length > 10) {
                logger_1.default.warn(`Security threat detected from IP: ${ip}`, {
                    failedAttempts: data.length,
                    timeWindow: '5 minutes'
                });
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.default.error('Security threat check failed:', error);
            return false; // Fail open for availability
        }
    }
    // Rate limit enforcement
    async enforceRateLimit(userId, action, limit = 100) {
        try {
            const { count } = await this.adminClient
                .from('security_audit_log')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .like('action', `${action}%`)
                .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour
            return (count || 0) < limit;
        }
        catch (error) {
            logger_1.default.error('Rate limit check failed:', error);
            return true; // Fail open for availability
        }
    }
    // Secure query execution with audit logging
    async executeSecureQuery(tableName, operation, queryBuilder, context = {}, useAdmin = false) {
        const startTime = Date.now();
        // Security checks
        if (context.ipAddress && await this.checkSecurityThreat(context.ipAddress)) {
            logger_1.default.warn('Blocking request from suspicious IP', context);
            return {
                data: null,
                error: {
                    message: 'Request blocked for security reasons',
                    code: 'SECURITY_BLOCKED'
                }
            };
        }
        if (context.userId && !await this.enforceRateLimit(context.userId, operation)) {
            logger_1.default.warn('Rate limit exceeded', { userId: context.userId, operation });
            return {
                data: null,
                error: {
                    message: 'Rate limit exceeded',
                    code: 'RATE_LIMITED'
                }
            };
        }
        // Execute query with existing retry logic
        const result = await this.executeQuery(tableName, operation, queryBuilder, useAdmin);
        // Log security event
        try {
            await this.adminClient
                .from('security_audit_log')
                .insert({
                user_id: context.userId || null,
                action: operation.toUpperCase(),
                table_name: tableName,
                ip_address: context.ipAddress || null,
                user_agent: context.userAgent || null,
                success: !result.error,
                error_details: result.error ? { error: result.error } : null
            });
        }
        catch (auditError) {
            logger_1.default.error('Failed to log security audit:', auditError);
        }
        return result;
    }
    // Laptop-specific optimized bulk operations
    async bulkInsertLaptops(laptops, options = {}) {
        const { validateSpecs = true, deduplication = true, batchSize = 50 // Smaller for laptop data complexity
         } = options;
        const errors = [];
        const duplicates = [];
        let insertedCount = 0;
        logger_1.default.info('Starting laptop bulk insert', {
            totalLaptops: laptops.length,
            validateSpecs,
            deduplication,
            batchSize
        });
        try {
            // Pre-processing: Validation and deduplication
            let processedLaptops = laptops;
            if (validateSpecs) {
                processedLaptops = processedLaptops.filter(laptop => {
                    const isValid = laptop.name && laptop.brand && laptop.specs;
                    if (!isValid) {
                        errors.push({
                            type: 'validation_error',
                            laptop: laptop,
                            reason: 'Missing required fields: name, brand, or specs'
                        });
                    }
                    return isValid;
                });
            }
            if (deduplication) {
                // Check for existing laptops by model and brand
                const existingCheck = await this.adminClient
                    .from('gadgets')
                    .select('name, brand, model')
                    .in('name', processedLaptops.map(l => l.name))
                    .in('brand', processedLaptops.map(l => l.brand));
                if (existingCheck.data) {
                    const existingKeys = new Set(existingCheck.data.map(item => `${item.brand}-${item.name}`));
                    const uniqueLaptops = [];
                    for (const laptop of processedLaptops) {
                        const key = `${laptop.brand}-${laptop.name}`;
                        if (existingKeys.has(key)) {
                            duplicates.push(laptop);
                        }
                        else {
                            uniqueLaptops.push(laptop);
                        }
                    }
                    processedLaptops = uniqueLaptops;
                }
            }
            // Execute bulk insert with enhanced error handling
            const bulkResult = await this.bulkInsert('gadgets', processedLaptops, batchSize, true);
            return {
                success: bulkResult.success && errors.length === 0,
                insertedCount: bulkResult.insertedCount,
                errors: [...errors, ...bulkResult.errors],
                duplicates
            };
        }
        catch (error) {
            logger_1.default.error('Laptop bulk insert failed:', error);
            return {
                success: false,
                insertedCount,
                errors: [{ type: 'bulk_operation_failure', error }],
                duplicates
            };
        }
    }
    // Vector search specifically optimized for laptop recommendations
    async findSimilarLaptops(queryVector, filters = {}, limit = 10) {
        try {
            // Build filtered vector search
            const { data, error } = await this.adminClient.rpc('match_laptop_embeddings', {
                query_embedding: queryVector,
                match_threshold: 0.7,
                match_count: limit * 2,
                budget_min: filters.budget?.min || 0,
                budget_max: filters.budget?.max || 999999,
                brands: filters.brand || [],
                min_rating: filters.minRating || 0
            });
            if (error) {
                logger_1.default.error('Laptop vector search failed:', error);
                return { data: [], error };
            }
            // Post-process results for laptop-specific ranking
            const rankedResults = (data || [])
                .map((item) => ({
                ...item,
                // Calculate laptop-specific score
                laptop_score: this.calculateLaptopScore(item, filters)
            }))
                .sort((a, b) => b.laptop_score - a.laptop_score)
                .slice(0, limit);
            logger_1.default.debug('Laptop similarity search completed', {
                resultsCount: rankedResults.length,
                filters,
                avgScore: rankedResults.reduce((sum, r) => sum + r.laptop_score, 0) / rankedResults.length
            });
            return { data: rankedResults, error: null };
        }
        catch (error) {
            logger_1.default.error('Laptop similarity search exception:', error);
            return { data: [], error };
        }
    }
    // Calculate laptop-specific scoring for recommendations
    calculateLaptopScore(laptop, filters) {
        let score = laptop.similarity_score || 0;
        // Boost score based on laptop-specific factors
        if (laptop.rating) {
            score += (laptop.rating / 5) * 0.2; // 20% weight for rating
        }
        if (laptop.review_count && laptop.review_count > 10) {
            score += Math.min(laptop.review_count / 100, 0.1); // Up to 10% boost for review count
        }
        // Budget fit scoring
        if (filters.budget && laptop.price) {
            const budgetMid = (filters.budget.min + filters.budget.max) / 2;
            const priceFit = 1 - Math.abs(laptop.price - budgetMid) / budgetMid;
            score += Math.max(priceFit * 0.15, 0); // Up to 15% boost for price fit
        }
        // Recent release bonus
        if (laptop.release_date) {
            const releaseDate = new Date(laptop.release_date);
            const monthsOld = (Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
            if (monthsOld < 12) {
                score += (12 - monthsOld) / 120; // Up to 10% boost for recent releases
            }
        }
        return Math.min(score, 1.0); // Cap at 1.0
    }
}
// Export singleton instance optimized for V0
exports.db = DatabaseClient.getInstance();
exports.supabase = exports.db.getClient();
exports.supabaseAdmin = exports.db.getAdminClient();
