import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabaseClient';
import { 
  Gadget, 
  ApiResponse, 
  PaginatedResponse, 
  SearchFilters 
} from '@gadgetguru/shared';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import Joi from 'joi';

const router: Router = Router();

// Validation schemas
const searchSchema = Joi.object({
  query: Joi.string().optional(),
  brands: Joi.array().items(Joi.string()).optional(),
  price_min: Joi.number().min(0).optional(),
  price_max: Joi.number().min(0).optional(),
  rating_min: Joi.number().min(1).max(5).optional(),
  sort_by: Joi.string().valid('price_asc', 'price_desc', 'rating', 'name', 'created_at').optional(),
  limit: Joi.number().min(1).max(100).default(10),
  offset: Joi.number().min(0).default(0),
});

const gadgetSchema = Joi.object({
  name: Joi.string().required().min(2).max(200),
  brand: Joi.string().optional().max(100),
  price: Joi.number().min(0).optional(),
  image_url: Joi.string().uri().optional(),
  link: Joi.string().uri().optional(),
  specs: Joi.object().optional(),
});

// GET /api/gadgets - Search and list gadgets
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { error: validationError, value: filters } = searchSchema.validate(req.query);
  
  if (validationError) {
    return res.status(400).json({
      error: validationError.details[0].message,
      code: 'VALIDATION_ERROR',
    });
  }

  const { query, brands, price_min, price_max, rating_min, sort_by, limit, offset } = filters;

  let dbQuery = supabase
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
    logger.error('Error fetching gadgets:', error);
    return res.status(500).json({
      error: 'Failed to fetch gadgets',
      code: 'DATABASE_ERROR',
    });
  }

  const response: PaginatedResponse<Gadget> = {
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
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F-]{36}$/)) {
    return res.status(400).json({
      error: 'Invalid gadget ID format',
      code: 'INVALID_ID',
    });
  }

  const { data, error } = await supabase
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
    
    logger.error('Error fetching gadget:', error);
    return res.status(500).json({
      error: 'Failed to fetch gadget',
      code: 'DATABASE_ERROR',
    });
  }

  const response: ApiResponse<Gadget> = { 
    success: true, 
    data 
  };
  res.json(response);
}));

// POST /api/gadgets - Create new gadget (admin only for now)
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { error: validationError, value: gadgetData } = gadgetSchema.validate(req.body);
  
  if (validationError) {
    return res.status(400).json({
      error: validationError.details[0].message,
      code: 'VALIDATION_ERROR',
    });
  }

  const { data, error } = await supabase
    .from('gadgets')
    .insert(gadgetData)
    .select()
    .single();

  if (error) {
    logger.error('Error creating gadget:', error);
    return res.status(500).json({
      error: 'Failed to create gadget',
      code: 'DATABASE_ERROR',
    });
  }

  logger.info('Gadget created:', { id: data.id, name: data.name });
  
  const response: ApiResponse<Gadget> = { 
    success: true,
    data 
  };
  res.status(201).json(response);
}));

// GET /api/gadgets/brands - Get available brands
router.get('/meta/brands', asyncHandler(async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('gadgets')
    .select('brand')
    .not('brand', 'is', null)
    .order('brand');

  if (error) {
    logger.error('Error fetching brands:', error);
    return res.status(500).json({
      error: 'Failed to fetch brands',
      code: 'DATABASE_ERROR',
    });
  }

  const brands = [...new Set(data?.map(item => item.brand).filter(Boolean))] as string[];
  
  const response: ApiResponse<string[]> = { 
    success: true,
    data: brands 
  };
  res.json(response);
}));

export default router;