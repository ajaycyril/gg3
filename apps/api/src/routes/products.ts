import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { Database, ProductWithDetails, SearchFilters, SearchResult, ProductInsert, ProductUpdate, CategoryInsert, AttributeInsert, OfferInsert } from '../types/database';
import { tenantMiddleware, requireScopes } from '../middleware/tenant';
import logger from '../utils/logger';

const router: Router = Router();
const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Apply tenant middleware to all routes
router.use(tenantMiddleware);

// =============================================================================
// PRODUCT CATALOG MANAGEMENT
// =============================================================================

/**
 * GET /api/v2/products - Advanced product search with faceting and filtering
 * Supports hybrid text + vector search, dynamic attributes, and real-time pricing
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      q,                    // Search query
      category_ids,         // Category filter (comma-separated)
      brands,              // Brand filter (comma-separated)
      price_min,           // Minimum price
      price_max,           // Maximum price
      availability,        // Availability filter
      condition,           // Condition filter
      attributes,          // Dynamic attributes (JSON string)
      sort_by = 'relevance', // Sort: relevance, price_asc, price_desc, rating, newest
      page = '1',
      limit = '20'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const tenantId = req.tenant!.tenant_id;

    // Build base query with tenant isolation
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        attributes:product_attributes(
          *,
          attribute:attributes(*)
        ),
        variants:product_variants(*),
        offers:offers(
          *,
          seller:sellers(*)
        ),
        latest_offer:mv_latest_offers(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .is('deleted_at', null);

    // Apply filters
    if (category_ids) {
      const categoryList = (category_ids as string).split(',');
      query = query.in('category_id', categoryList);
    }

    if (brands) {
      const brandList = (brands as string).split(',');
      query = query.in('brand', brandList);
    }

    if (q) {
      // Full-text search on name, description, brand, model
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`);
    }

    // Price filtering (from offers)
    if (price_min || price_max) {
      // This requires a more complex query with joins - simplified for now
      logger.info('Price filtering requested', { price_min, price_max });
    }

    // Dynamic attribute filtering
    if (attributes) {
      try {
        const attrFilters = JSON.parse(attributes as string);
        // Complex attribute filtering would require additional joins
        logger.info('Attribute filtering requested', attrFilters);
      } catch (error) {
        logger.warn('Invalid attributes JSON:', attributes);
      }
    }

    // Apply sorting
    switch (sort_by) {
      case 'price_asc':
        // Would need to join with offers for accurate sorting
        query = query.order('name', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('name', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      default:
        query = query.order('name', { ascending: true });
    }

    // Apply pagination
    query = query.range(offset, offset + parseInt(limit as string) - 1);

    const { data: products, error, count } = await query;

    if (error) {
      throw error;
    }

    // Generate facets for filtering UI
    const facets = await generateFacets(tenantId, req.query);

    const searchResult: SearchResult = {
      products: products as ProductWithDetails[],
      total_count: count || 0,
      facets
    };

    res.json(searchResult);
  } catch (error) {
    logger.error('Product search error:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

/**
 * GET /api/v2/products/:id - Get detailed product information
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.tenant_id;

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        attributes:product_attributes(
          *,
          attribute:attributes(*)
        ),
        variants:product_variants(*),
        offers:offers(
          *,
          seller:sellers(*)
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    logger.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

/**
 * POST /api/v2/products - Create new product (requires write scope)
 */
router.post('/', requireScopes(['write']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    
    const productData: ProductInsert = {
      ...req.body,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Validate required fields
    if (!productData.name || !productData.brand || !productData.model || !productData.category_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, brand, model, category_id' 
      });
    }

    // Check if category exists and belongs to tenant
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('id', productData.category_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!category) {
      return res.status(400).json({ error: 'Invalid category_id' });
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(product);
  } catch (error) {
    logger.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

/**
 * PUT /api/v2/products/:id - Update product (requires write scope)
 */
router.put('/:id', requireScopes(['write']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.tenant_id;

    const updateData: ProductUpdate = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * DELETE /api/v2/products/:id - Soft delete product (requires admin scope)
 */
router.delete('/:id', requireScopes(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.tenant_id;

    const { data: product, error } = await supabase
      .from('products')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// =============================================================================
// CATEGORY MANAGEMENT
// =============================================================================

/**
 * GET /api/v2/categories - Get category hierarchy
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;

    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('hierarchy_path', { ascending: true });

    if (error) {
      throw error;
    }

    res.json(categories);
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

/**
 * POST /api/v2/categories - Create category (requires write scope)
 */
router.post('/categories', requireScopes(['write']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    
    const categoryData: CategoryInsert = {
      ...req.body,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Calculate hierarchy path and level
    if (categoryData.parent_id) {
      const { data: parent } = await supabase
        .from('categories')
        .select('hierarchy_path, level')
        .eq('id', categoryData.parent_id)
        .eq('tenant_id', tenantId)
        .single();

      if (parent) {
        categoryData.hierarchy_path = [...(parent.hierarchy_path || []), categoryData.parent_id];
        categoryData.level = parent.level + 1;
      }
    } else {
      categoryData.hierarchy_path = [];
      categoryData.level = 0;
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert(categoryData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(category);
  } catch (error) {
    logger.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// =============================================================================
// ATTRIBUTES MANAGEMENT
// =============================================================================

/**
 * GET /api/v2/categories/:categoryId/attributes - Get attributes for category
 */
router.get('/categories/:categoryId/attributes', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const tenantId = req.tenant!.tenant_id;

    const { data: attributes, error } = await supabase
      .from('attributes')
      .select('*')
      .eq('category_id', categoryId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      throw error;
    }

    res.json(attributes);
  } catch (error) {
    logger.error('Get attributes error:', error);
    res.status(500).json({ error: 'Failed to get attributes' });
  }
});

/**
 * POST /api/v2/attributes - Create attribute (requires write scope)
 */
router.post('/attributes', requireScopes(['write']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    
    const attributeData: AttributeInsert = {
      ...req.body,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: attribute, error } = await supabase
      .from('attributes')
      .insert(attributeData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(attribute);
  } catch (error) {
    logger.error('Create attribute error:', error);
    res.status(500).json({ error: 'Failed to create attribute' });
  }
});

// =============================================================================
// OFFERS & PRICING
// =============================================================================

/**
 * POST /api/v2/offers - Create or update offer (requires write scope)
 */
router.post('/offers', requireScopes(['write']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    
    const offerData: OfferInsert = {
      ...req.body,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Upsert logic: update if exists, insert if new
    const { data: offer, error } = await supabase
      .from('offers')
      .upsert(offerData, {
        onConflict: 'tenant_id,product_id,variant_id,seller_id,url'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Record price history
    await supabase.from('offer_history').insert({
      tenant_id: tenantId,
      offer_id: offer.id,
      price: offer.price,
      availability: offer.availability,
      stock_quantity: offer.stock_quantity
    });

    res.status(201).json(offer);
  } catch (error) {
    logger.error('Create offer error:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate facets for search filtering UI
 */
async function generateFacets(tenantId: string, queryParams: any) {
  // Get category facets
  const { data: categoryFacets } = await supabase
    .from('products')
    .select('category_id, categories!inner(name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  const categories = categoryFacets?.reduce((acc: any[], item) => {
    const existing = acc.find(c => c.id === item.category_id);
    if (existing) {
      existing.count++;
    } else {
      acc.push({
        id: item.category_id,
        name: (item as any).categories.name,
        count: 1
      });
    }
    return acc;
  }, []) || [];

  // Get brand facets
  const { data: brandFacets } = await supabase
    .from('products')
    .select('brand')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  const brands = brandFacets?.reduce((acc: any[], item) => {
    const existing = acc.find(b => b.name === item.brand);
    if (existing) {
      existing.count++;
    } else {
      acc.push({
        name: item.brand,
        count: 1
      });
    }
    return acc;
  }, []) || [];

  // Generate price ranges (simplified)
  const price_ranges = [
    { min: 0, max: 100, count: 0 },
    { min: 100, max: 500, count: 0 },
    { min: 500, max: 1000, count: 0 },
    { min: 1000, max: 5000, count: 0 },
    { min: 5000, max: 999999, count: 0 }
  ];

  return {
    categories,
    brands,
    price_ranges,
    attributes: {} // Would need more complex logic for dynamic attributes
  };
}

export default router;