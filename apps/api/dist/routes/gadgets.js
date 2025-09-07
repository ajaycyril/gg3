"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabaseClient_1 = require("../db/supabaseClient");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
// Validation schemas
const searchSchema = joi_1.default.object({
    query: joi_1.default.string().optional(),
    brands: joi_1.default.array().items(joi_1.default.string()).optional(),
    price_min: joi_1.default.number().min(0).optional(),
    price_max: joi_1.default.number().min(0).optional(),
    rating_min: joi_1.default.number().min(1).max(5).optional(),
    sort_by: joi_1.default.string().valid('price_asc', 'price_desc', 'rating', 'name', 'created_at').optional(),
    limit: joi_1.default.number().min(1).max(100).default(10),
    offset: joi_1.default.number().min(0).default(0),
});
const gadgetSchema = joi_1.default.object({
    name: joi_1.default.string().required().min(2).max(200),
    brand: joi_1.default.string().optional().max(100),
    price: joi_1.default.number().min(0).optional(),
    image_url: joi_1.default.string().uri().optional(),
    link: joi_1.default.string().uri().optional(),
    specs: joi_1.default.object().optional(),
});
// GET /api/gadgets - Search and list gadgets
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error: validationError, value: filters } = searchSchema.validate(req.query);
    if (validationError) {
        return res.status(400).json({
            error: validationError.details[0].message,
            code: 'VALIDATION_ERROR',
        });
    }
    const { query, brands, price_min, price_max, rating_min, sort_by, limit, offset } = filters;
    let dbQuery = supabaseClient_1.supabase
        .from('gadgets')
        .select(`
      *,
      reviews:reviews(id, content, rating, author, source, created_at)
    `, { count: 'exact' });
    // Apply filters
    if (query) {
        dbQuery = dbQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%`);
    }
    if (brands && brands.length > 0) {
        dbQuery = dbQuery.in('brand', brands);
    }
    if (price_min !== undefined) {
        dbQuery = dbQuery.gte('price', price_min);
    }
    if (price_max !== undefined) {
        dbQuery = dbQuery.lte('price', price_max);
    }
    // Apply sorting
    switch (sort_by) {
        case 'price_asc':
            dbQuery = dbQuery.order('price', { ascending: true });
            break;
        case 'price_desc':
            dbQuery = dbQuery.order('price', { ascending: false });
            break;
        case 'name':
            dbQuery = dbQuery.order('name', { ascending: true });
            break;
        case 'created_at':
            dbQuery = dbQuery.order('created_at', { ascending: false });
            break;
        default:
            dbQuery = dbQuery.order('created_at', { ascending: false });
    }
    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);
    const { data, error, count } = await dbQuery;
    if (error) {
        logger_1.default.error('Error fetching gadgets:', error);
        return res.status(500).json({
            error: 'Failed to fetch gadgets',
            code: 'DATABASE_ERROR',
        });
    }
    const response = {
        success: true,
        data: data || [],
        pagination: {
            total: count || 0,
            page: Math.floor(offset / limit) + 1,
            limit,
            offset,
            totalPages: Math.ceil((count || 0) / limit),
            hasMore: (count || 0) > offset + limit,
        },
    };
    res.json(response);
}));
// GET /api/gadgets/:id - Get specific gadget with related data
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F-]{36}$/)) {
        return res.status(400).json({
            error: 'Invalid gadget ID format',
            code: 'INVALID_ID',
        });
    }
    const { data, error } = await supabaseClient_1.supabase
        .from('gadgets')
        .select(`
      *,
      reviews:reviews(*),
      specs_normalized:specs_normalized(*),
      benchmarks:benchmarks(*)
    `)
        .eq('id', id)
        .single();
    if (error) {
        if (error.code === 'PGRST116') {
            return res.status(404).json({
                error: 'Gadget not found',
                code: 'NOT_FOUND',
            });
        }
        logger_1.default.error('Error fetching gadget:', error);
        return res.status(500).json({
            error: 'Failed to fetch gadget',
            code: 'DATABASE_ERROR',
        });
    }
    const response = {
        success: true,
        data
    };
    res.json(response);
}));
// POST /api/gadgets - Create new gadget (admin only for now)
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error: validationError, value: gadgetData } = gadgetSchema.validate(req.body);
    if (validationError) {
        return res.status(400).json({
            error: validationError.details[0].message,
            code: 'VALIDATION_ERROR',
        });
    }
    const { data, error } = await supabaseClient_1.supabase
        .from('gadgets')
        .insert(gadgetData)
        .select()
        .single();
    if (error) {
        logger_1.default.error('Error creating gadget:', error);
        return res.status(500).json({
            error: 'Failed to create gadget',
            code: 'DATABASE_ERROR',
        });
    }
    logger_1.default.info('Gadget created:', { id: data.id, name: data.name });
    const response = {
        success: true,
        data
    };
    res.status(201).json(response);
}));
// GET /api/gadgets/brands - Get available brands
router.get('/meta/brands', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { data, error } = await supabaseClient_1.supabase
        .from('gadgets')
        .select('brand')
        .not('brand', 'is', null)
        .order('brand');
    if (error) {
        logger_1.default.error('Error fetching brands:', error);
        return res.status(500).json({
            error: 'Failed to fetch brands',
            code: 'DATABASE_ERROR',
        });
    }
    const brands = [...new Set(data?.map(item => item.brand).filter(Boolean))];
    const response = {
        success: true,
        data: brands
    };
    res.json(response);
}));
// Alias for clients expecting /api/gadgets/brands
router.get('/brands', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { data, error } = await supabaseClient_1.supabase
        .from('gadgets')
        .select('brand')
        .not('brand', 'is', null)
        .order('brand');
    if (error) {
        logger_1.default.error('Error fetching brands (alias):', error);
        return res.status(500).json({
            error: 'Failed to fetch brands',
            code: 'DATABASE_ERROR',
        });
    }
    const brands = [...new Set(data?.map(item => item.brand).filter(Boolean))];
    res.json({ success: true, data: brands });
}));
exports.default = router;
