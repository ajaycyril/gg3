export interface Database {
  public: {
    Tables: {
      // Legacy tables for backward compatibility
      gadgets: {
        Row: {
          id: string
          name: string
          brand: string | null
          price: number | null
          image_url: string | null
          link: string | null
          specs: any | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          brand?: string | null
          price?: number | null
          image_url?: string | null
          link?: string | null
          specs?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          brand?: string | null
          price?: number | null
          image_url?: string | null
          link?: string | null
          specs?: any | null
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          gadget_id: string
          content: string
          author: string | null
          source: string | null
          rating: number | null
          created_at: string
        }
      }
      users: {
        Row: {
          id: string
          auth_id: string | null
          display_name: string | null
          email: string | null
          preferences: any | null
          created_at: string
        }
      }
      user_recommendations: {
        Row: {
          id: string
          user_id: string
          gadget_id: string | null
          prompt: string
          result: any
          created_at: string
        }
      }

      // New enterprise tables
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          domain: string | null;
          plan: 'starter' | 'professional' | 'enterprise';
          settings: Record<string, any>;
          quotas: Record<string, any>;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          domain?: string | null;
          plan?: 'starter' | 'professional' | 'enterprise';
          settings?: Record<string, any>;
          quotas?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          domain?: string | null;
          plan?: 'starter' | 'professional' | 'enterprise';
          settings?: Record<string, any>;
          quotas?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      tenant_api_keys: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          scopes: string[];
          quotas: Record<string, any>;
          last_used_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          scopes?: string[];
          quotas?: Record<string, any>;
          last_used_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          key_hash?: string;
          key_prefix?: string;
          scopes?: string[];
          quotas?: Record<string, any>;
          last_used_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      categories: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          slug: string;
          description: string | null;
          parent_id: string | null;
          hierarchy_path: string[] | null;
          level: number;
          sort_order: number;
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          slug: string;
          description?: string | null;
          parent_id?: string | null;
          hierarchy_path?: string[] | null;
          level?: number;
          sort_order?: number;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          parent_id?: string | null;
          hierarchy_path?: string[] | null;
          level?: number;
          sort_order?: number;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      attributes: {
        Row: {
          id: string;
          tenant_id: string;
          category_id: string;
          name: string;
          slug: string;
          data_type: 'text' | 'number' | 'boolean' | 'enum' | 'range';
          unit: string | null;
          enum_values: string[] | null;
          validation_rules: Record<string, any>;
          is_required: boolean;
          is_filterable: boolean;
          is_searchable: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          category_id: string;
          name: string;
          slug: string;
          data_type: 'text' | 'number' | 'boolean' | 'enum' | 'range';
          unit?: string | null;
          enum_values?: string[] | null;
          validation_rules?: Record<string, any>;
          is_required?: boolean;
          is_filterable?: boolean;
          is_searchable?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          category_id?: string;
          name?: string;
          slug?: string;
          data_type?: 'text' | 'number' | 'boolean' | 'enum' | 'range';
          unit?: string | null;
          enum_values?: string[] | null;
          validation_rules?: Record<string, any>;
          is_required?: boolean;
          is_filterable?: boolean;
          is_searchable?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      products: {
        Row: {
          id: string;
          tenant_id: string;
          category_id: string;
          gtin: string | null;
          mpn: string | null;
          brand: string;
          model: string;
          year: number | null;
          name: string;
          description: string | null;
          status: 'draft' | 'active' | 'discontinued';
          raw_specs: Record<string, any>;
          source_urls: string[] | null;
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          category_id: string;
          gtin?: string | null;
          mpn?: string | null;
          brand: string;
          model: string;
          year?: number | null;
          name: string;
          description?: string | null;
          status?: 'draft' | 'active' | 'discontinued';
          raw_specs?: Record<string, any>;
          source_urls?: string[] | null;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          category_id?: string;
          gtin?: string | null;
          mpn?: string | null;
          brand?: string;
          model?: string;
          year?: number | null;
          name?: string;
          description?: string | null;
          status?: 'draft' | 'active' | 'discontinued';
          raw_specs?: Record<string, any>;
          source_urls?: string[] | null;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      product_attributes: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          attribute_id: string;
          value_text: string | null;
          value_number: number | null;
          value_boolean: boolean | null;
          value_enum: string | null;
          value_range_min: number | null;
          value_range_max: number | null;
          original_value: string | null;
          original_unit: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id: string;
          attribute_id: string;
          value_text?: string | null;
          value_number?: number | null;
          value_boolean?: boolean | null;
          value_enum?: string | null;
          value_range_min?: number | null;
          value_range_max?: number | null;
          original_value?: string | null;
          original_unit?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          product_id?: string;
          attribute_id?: string;
          value_text?: string | null;
          value_number?: number | null;
          value_boolean?: boolean | null;
          value_enum?: string | null;
          value_range_min?: number | null;
          value_range_max?: number | null;
          original_value?: string | null;
          original_unit?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      product_variants: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          name: string;
          sku: string | null;
          gtin: string | null;
          variant_attributes: Record<string, any>;
          status: 'active' | 'discontinued';
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id: string;
          name: string;
          sku?: string | null;
          gtin?: string | null;
          variant_attributes?: Record<string, any>;
          status?: 'active' | 'discontinued';
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          product_id?: string;
          name?: string;
          sku?: string | null;
          gtin?: string | null;
          variant_attributes?: Record<string, any>;
          status?: 'active' | 'discontinued';
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      sellers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          domain: string | null;
          country_code: string | null;
          currency: string;
          affiliate_program: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          domain?: string | null;
          country_code?: string | null;
          currency?: string;
          affiliate_program?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          domain?: string | null;
          country_code?: string | null;
          currency?: string;
          affiliate_program?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      offers: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          variant_id: string | null;
          seller_id: string;
          price: number;
          currency: string;
          original_price: number | null;
          url: string;
          affiliate_id: string | null;
          partner_id: string | null;
          campaign_id: string | null;
          utm_params: Record<string, any>;
          availability: 'in_stock' | 'out_of_stock' | 'limited' | 'preorder';
          condition: 'new' | 'refurbished' | 'used';
          stock_quantity: number | null;
          shipping_cost: number | null;
          shipping_days: number | null;
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id: string;
          variant_id?: string | null;
          seller_id: string;
          price: number;
          currency?: string;
          original_price?: number | null;
          url: string;
          affiliate_id?: string | null;
          partner_id?: string | null;
          campaign_id?: string | null;
          utm_params?: Record<string, any>;
          availability?: 'in_stock' | 'out_of_stock' | 'limited' | 'preorder';
          condition?: 'new' | 'refurbished' | 'used';
          stock_quantity?: number | null;
          shipping_cost?: number | null;
          shipping_days?: number | null;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          product_id?: string;
          variant_id?: string | null;
          seller_id?: string;
          price?: number;
          currency?: string;
          original_price?: number | null;
          url?: string;
          affiliate_id?: string | null;
          partner_id?: string | null;
          campaign_id?: string | null;
          utm_params?: Record<string, any>;
          availability?: 'in_stock' | 'out_of_stock' | 'limited' | 'preorder';
          condition?: 'new' | 'refurbished' | 'used';
          stock_quantity?: number | null;
          shipping_cost?: number | null;
          shipping_days?: number | null;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };

      recommendation_sets: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          session_id: string | null;
          model_name: string;
          model_version: string;
          query_text: string | null;
          filters: Record<string, any>;
          candidate_set_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          session_id?: string | null;
          model_name: string;
          model_version: string;
          query_text?: string | null;
          filters?: Record<string, any>;
          candidate_set_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          session_id?: string | null;
          model_name?: string;
          model_version?: string;
          query_text?: string | null;
          filters?: Record<string, any>;
          candidate_set_hash?: string | null;
          created_at?: string;
        };
      };

      recommendations: {
        Row: {
          id: string;
          tenant_id: string;
          set_id: string;
          product_id: string;
          rank: number;
          score: number;
          reasoning_bullets: string[] | null;
          evidence_links: Record<string, any>;
          feature_attribution: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          set_id: string;
          product_id: string;
          rank: number;
          score: number;
          reasoning_bullets?: string[] | null;
          evidence_links?: Record<string, any>;
          feature_attribution?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          set_id?: string;
          product_id?: string;
          rank?: number;
          score?: number;
          reasoning_bullets?: string[] | null;
          evidence_links?: Record<string, any>;
          feature_attribution?: Record<string, any>;
          created_at?: string;
        };
      };

      events: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          session_id: string | null;
          event_type: string;
          event_name: string;
          properties: Record<string, any>;
          occurred_at: string;
          user_agent: string | null;
          ip_address: string | null;
          referrer: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          session_id?: string | null;
          event_type: string;
          event_name: string;
          properties?: Record<string, any>;
          occurred_at?: string;
          user_agent?: string | null;
          ip_address?: string | null;
          referrer?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          session_id?: string | null;
          event_type?: string;
          event_name?: string;
          properties?: Record<string, any>;
          occurred_at?: string;
          user_agent?: string | null;
          ip_address?: string | null;
          referrer?: string | null;
        };
      };
    };
    Views: {
      mv_latest_offers: {
        Row: {
          tenant_id: string;
          product_id: string;
          variant_id: string | null;
          seller_id: string;
          price: number;
          currency: string;
          availability: string;
          url: string;
          updated_at: string;
        };
      };
      mv_category_attributes: {
        Row: {
          tenant_id: string;
          category_id: string;
          attribute_id: string;
          attribute_name: string;
          data_type: string;
          product_count: number;
          distinct_text_values: number;
          min_number_value: number | null;
          max_number_value: number | null;
        };
      };
    };
    Functions: {
      set_tenant_context: {
        Args: { tenant_uuid: string };
        Returns: void;
      };
      get_current_tenant: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
  };
}

export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type TenantInsert = Database['public']['Tables']['tenants']['Insert'];
export type TenantUpdate = Database['public']['Tables']['tenants']['Update'];

export type Category = Database['public']['Tables']['categories']['Row'];
export type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
export type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

export type Attribute = Database['public']['Tables']['attributes']['Row'];
export type AttributeInsert = Database['public']['Tables']['attributes']['Insert'];
export type AttributeUpdate = Database['public']['Tables']['attributes']['Update'];

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

export type ProductAttribute = Database['public']['Tables']['product_attributes']['Row'];
export type ProductAttributeInsert = Database['public']['Tables']['product_attributes']['Insert'];
export type ProductAttributeUpdate = Database['public']['Tables']['product_attributes']['Update'];

export type ProductVariant = Database['public']['Tables']['product_variants']['Row'];
export type ProductVariantInsert = Database['public']['Tables']['product_variants']['Insert'];
export type ProductVariantUpdate = Database['public']['Tables']['product_variants']['Update'];

export type Seller = Database['public']['Tables']['sellers']['Row'];
export type SellerInsert = Database['public']['Tables']['sellers']['Insert'];
export type SellerUpdate = Database['public']['Tables']['sellers']['Update'];

export type Offer = Database['public']['Tables']['offers']['Row'];
export type OfferInsert = Database['public']['Tables']['offers']['Insert'];
export type OfferUpdate = Database['public']['Tables']['offers']['Update'];

export type RecommendationSet = Database['public']['Tables']['recommendation_sets']['Row'];
export type Recommendation = Database['public']['Tables']['recommendations']['Row'];

export type AnalyticsEvent = Database['public']['Tables']['events']['Row'];
export type AnalyticsEventInsert = Database['public']['Tables']['events']['Insert'];

export type Gadget = Database['public']['Tables']['gadgets']['Row'];
export type GadgetInsert = Database['public']['Tables']['gadgets']['Insert'];
export type GadgetUpdate = Database['public']['Tables']['gadgets']['Update'];

export interface ProductWithDetails extends Product {
  category: Category;
  attributes: (ProductAttribute & { attribute: Attribute })[];
  variants: ProductVariant[];
  offers: (Offer & { seller: Seller })[];
  latest_offer?: Database['public']['Views']['mv_latest_offers']['Row'];
}

export interface RecommendationWithProduct extends Recommendation {
  product: ProductWithDetails;
}

export interface SearchFilters {
  tenant_id?: string;
  category_ids?: string[];
  brands?: string[];
  price_min?: number;
  price_max?: number;
  attributes?: Record<string, any>;
  availability?: string[];
  condition?: string[];
}

export interface SearchResult {
  products: ProductWithDetails[];
  total_count: number;
  facets: {
    categories: Array<{ id: string; name: string; count: number }>;
    brands: Array<{ name: string; count: number }>;
    price_ranges: Array<{ min: number; max: number; count: number }>;
    attributes: Record<string, Array<{ value: string; count: number }>>;
  };
}

export interface TenantContext {
  tenant_id: string;
  tenant: Tenant;
  api_key?: {
    id: string;
    name: string;
    scopes: string[];
    quotas: Record<string, any>;
  };
}

export class TenantError extends Error {
  constructor(message: string, public code: string = 'TENANT_ERROR') {
    super(message);
    this.name = 'TenantError';
  }
}

export class QuotaError extends Error {
  constructor(message: string, public quotaType: string, public limit: number, public current: number) {
    super(message);
    this.name = 'QuotaError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field: string, public value: any) {
    super(message);
    this.name = 'ValidationError';
  }
}