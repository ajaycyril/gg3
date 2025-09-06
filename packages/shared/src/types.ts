// Database Types - Auto-generated from Supabase schema
export interface Database {
  public: {
    Tables: {
      gadgets: {
        Row: {
          id: string
          name: string
          brand: string | null
          price: number | null
          image_url: string | null
          link: string | null
          specs: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          brand?: string | null
          price?: number | null
          image_url?: string | null
          link?: string | null
          specs?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          brand?: string | null
          price?: number | null
          image_url?: string | null
          link?: string | null
          specs?: Json | null
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
        Insert: {
          id?: string
          gadget_id: string
          content: string
          author?: string | null
          source?: string | null
          rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          gadget_id?: string
          content?: string
          author?: string | null
          source?: string | null
          rating?: number | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          auth_id: string | null
          display_name: string | null
          email: string | null
          preferences: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          auth_id?: string | null
          display_name?: string | null
          email?: string | null
          preferences?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          auth_id?: string | null
          display_name?: string | null
          email?: string | null
          preferences?: Json | null
          created_at?: string
        }
      }
      recommendations: {
        Row: {
          id: string
          user_id: string
          gadget_id: string | null
          prompt: string | null
          result: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gadget_id?: string | null
          prompt?: string | null
          result?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gadget_id?: string | null
          prompt?: string | null
          result?: Json | null
          created_at?: string
        }
      }
      feedback: {
        Row: {
          id: string
          user_id: string
          recommendation_id: string | null
          text: string | null
          rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recommendation_id?: string | null
          text?: string | null
          rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          recommendation_id?: string | null
          text?: string | null
          rating?: number | null
          created_at?: string
        }
      }
      specs_normalized: {
        Row: {
          id: string
          gadget_id: string
          key: string
          value: string | null
          created_at: string
        }
        Insert: {
          id?: string
          gadget_id: string
          key: string
          value?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          gadget_id?: string
          key?: string
          value?: string | null
          created_at?: string
        }
      }
      benchmarks: {
        Row: {
          id: string
          gadget_id: string
          context_json: Json | null
          score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          gadget_id: string
          context_json?: Json | null
          score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          gadget_id?: string
          context_json?: Json | null
          score?: number | null
          created_at?: string
        }
      }
    }
  }
}

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Core domain types
export interface Gadget {
  id: string;
  name: string;
  brand: string;
  category: string;
  price?: number;
  currency?: string;
  image_url?: string;
  amazon_url?: string;
  description?: string;
  key_features?: string[];
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  gadget_id: string;
  source: 'amazon' | 'reddit' | 'youtube' | 'manual';
  author?: string;
  rating?: number;
  title?: string;
  content: string;
  source_url?: string;
  helpful_votes?: number;
  total_votes?: number;
  verified_purchase?: boolean;
  review_date?: string;
  created_at: string;
}

export interface Recommendation {
  id: string;
  user_id?: string;
  query: string;
  recommended_gadgets: RecommendedGadget[];
  reasoning: string;
  confidence_score: number;
  context_used: string[];
  created_at: string;
}

export interface RecommendedGadget {
  gadget_id: string;
  gadget: Gadget;
  score: number;
  reasoning: string;
  pros: string[];
  cons: string[];
  price_rating: 'excellent' | 'good' | 'fair' | 'poor';
  citations: Citation[];
}

export interface Citation {
  source: 'review' | 'spec' | 'benchmark';
  id: string;
  excerpt: string;
  relevance_score: number;
}

export interface SpecsNormalized {
  id: string;
  gadget_id: string;
  category: string;
  key: string;
  value: string;
  unit?: string;
  numeric_value?: number;
  created_at: string;
}

export interface Benchmark {
  id: string;
  gadget_id: string;
  benchmark_name: string;
  score: number;
  unit?: string;
  context_json: Record<string, any>;
  source_url?: string;
  test_date?: string;
  created_at: string;
}

export interface Embedding {
  id: string;
  content_type: 'review' | 'spec' | 'benchmark';
  content_id: string;
  vector: number[];
  created_at: string;
}

// User and Auth types
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  budget_range?: [number, number];
  preferred_brands?: string[];
  excluded_brands?: string[];
  preferred_categories?: string[];
  skill_level: 'beginner' | 'intermediate' | 'expert';
  priorities: Priority[];
  created_at: string;
  updated_at: string;
}

export interface Priority {
  factor: 'price' | 'performance' | 'battery' | 'design' | 'brand' | 'reviews';
  weight: number; // 1-10
}

export interface Feedback {
  id: string;
  user_id?: string;
  recommendation_id: string;
  rating: number; // 1-5
  helpful: boolean;
  comment?: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  pagination?: PaginationInfo;
}

export interface ApiError {
  error: string;
  code: string;
  details?: any;
  stack?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Query and filter types
export interface GadgetFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'name' | 'price' | 'rating' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchQuery {
  query: string;
  filters?: GadgetFilters;
  userPreferences?: Partial<UserPreferences>;
  includeReviews?: boolean;
  includeSpecs?: boolean;
  includeBenchmarks?: boolean;
}

// RAG and AI types
export interface RAGContext {
  reviews: Review[];
  specs: SpecsNormalized[];
  benchmarks: Benchmark[];
  similarGadgets: Gadget[];
}

export interface AIPromptContext {
  query: string;
  userPreferences?: UserPreferences;
  context: RAGContext;
  maxGadgets?: number;
}

// Scraping types
export interface ScrapingJob {
  id: string;
  type: 'amazon' | 'reddit' | 'youtube' | 'benchmark';
  status: 'pending' | 'running' | 'completed' | 'failed';
  target_url?: string;
  search_query?: string;
  results_count: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface ScrapedData {
  gadgets: Partial<Gadget>[];
  reviews: Partial<Review>[];
  specs: Partial<SpecsNormalized>[];
  benchmarks: Partial<Benchmark>[];
}

// Error types
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

// Utility types
export type DatabaseTable = 
  | 'gadgets'
  | 'reviews' 
  | 'recommendations'
  | 'specs_normalized'
  | 'benchmarks'
  | 'embeddings'
  | 'users'
  | 'user_preferences'
  | 'feedback'
  | 'scraping_jobs';

export type SortOrder = 'asc' | 'desc';
export type SkillLevel = 'beginner' | 'intermediate' | 'expert';
export type ReviewSource = 'amazon' | 'reddit' | 'youtube' | 'manual';