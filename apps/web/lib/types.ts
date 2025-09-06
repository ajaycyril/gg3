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
    }
  }
}

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Application Types
export interface Gadget {
  id: string
  name: string
  brand: string | null
  price: number | null
  image_url: string | null
  link: string | null
  specs: Record<string, any> | null
  created_at: string
  reviews?: Review[]
  specs_normalized?: SpecNormalized[]
  benchmarks?: Benchmark[]
}

export interface Review {
  id: string
  gadget_id: string
  content: string
  author: string | null
  source: string | null
  rating: number | null
  created_at: string
}

export interface SpecNormalized {
  id: string
  gadget_id: string
  key: string
  value: string | null
  created_at: string
}

export interface Benchmark {
  id: string
  gadget_id: string
  context_json: Record<string, any> | null
  score: number | null
  created_at: string
}

export interface User {
  id: string
  auth_id: string | null
  display_name: string | null
  email: string | null
  preferences: UserPreferences | null
  created_at: string
}

export interface UserPreferences {
  budget_range?: [number, number]
  preferred_brands?: string[]
  use_cases?: string[]
  experience_level?: 'beginner' | 'intermediate' | 'expert'
  notifications_enabled?: boolean
  saved_searches?: string[]
  saved_gadgets?: string[]
}

export interface Recommendation {
  id: string
  user_id: string
  gadget_id: string | null
  prompt: string | null
  result: RecommendationResult | null
  created_at: string
}

export interface RecommendationResult {
  summary: string
  pros: string[]
  cons: string[]
  score: number
  reasoning: string
  sources: Array<{
    type: 'review' | 'spec' | 'benchmark'
    id: string
    excerpt: string
  }>
  alternatives?: Array<{
    gadget_id: string
    reason: string
    score: number
  }>
}

export interface Feedback {
  id: string
  user_id: string
  recommendation_id: string | null
  text: string | null
  rating: number | null
  created_at: string
}

// API Response Types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Search & Filter Types
export interface SearchFilters {
  query?: string
  brands?: string[]
  price_min?: number
  price_max?: number
  rating_min?: number
  sort_by?: 'price_asc' | 'price_desc' | 'rating' | 'name' | 'created_at'
  limit?: number
  offset?: number
}