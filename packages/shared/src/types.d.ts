export interface Database {
    public: {
        Tables: {
            gadgets: {
                Row: {
                    id: string;
                    name: string;
                    brand: string | null;
                    price: number | null;
                    image_url: string | null;
                    link: string | null;
                    specs: Json | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    brand?: string | null;
                    price?: number | null;
                    image_url?: string | null;
                    link?: string | null;
                    specs?: Json | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    brand?: string | null;
                    price?: number | null;
                    image_url?: string | null;
                    link?: string | null;
                    specs?: Json | null;
                    created_at?: string;
                };
            };
            reviews: {
                Row: {
                    id: string;
                    gadget_id: string;
                    content: string;
                    author: string | null;
                    source: string | null;
                    rating: number | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    gadget_id: string;
                    content: string;
                    author?: string | null;
                    source?: string | null;
                    rating?: number | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    gadget_id?: string;
                    content?: string;
                    author?: string | null;
                    source?: string | null;
                    rating?: number | null;
                    created_at?: string;
                };
            };
            users: {
                Row: {
                    id: string;
                    auth_id: string | null;
                    display_name: string | null;
                    email: string | null;
                    preferences: Json | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    auth_id?: string | null;
                    display_name?: string | null;
                    email?: string | null;
                    preferences?: Json | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    auth_id?: string | null;
                    display_name?: string | null;
                    email?: string | null;
                    preferences?: Json | null;
                    created_at?: string;
                };
            };
            recommendations: {
                Row: {
                    id: string;
                    user_id: string;
                    gadget_id: string | null;
                    prompt: string | null;
                    result: Json | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    gadget_id?: string | null;
                    prompt?: string | null;
                    result?: Json | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    gadget_id?: string | null;
                    prompt?: string | null;
                    result?: Json | null;
                    created_at?: string;
                };
            };
            feedback: {
                Row: {
                    id: string;
                    user_id: string;
                    recommendation_id: string | null;
                    text: string | null;
                    rating: number | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    recommendation_id?: string | null;
                    text?: string | null;
                    rating?: number | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    recommendation_id?: string | null;
                    text?: string | null;
                    rating?: number | null;
                    created_at?: string;
                };
            };
            specs_normalized: {
                Row: {
                    id: string;
                    gadget_id: string;
                    key: string;
                    value: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    gadget_id: string;
                    key: string;
                    value?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    gadget_id?: string;
                    key?: string;
                    value?: string | null;
                    created_at?: string;
                };
            };
            benchmarks: {
                Row: {
                    id: string;
                    gadget_id: string;
                    context_json: Json | null;
                    score: number | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    gadget_id: string;
                    context_json?: Json | null;
                    score?: number | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    gadget_id?: string;
                    context_json?: Json | null;
                    score?: number | null;
                    created_at?: string;
                };
            };
        };
    };
}
export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
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
export interface AuthUser {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    user_metadata?: any;
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
    saved_gadgets?: string[];
    created_at: string;
    updated_at: string;
}
export interface Priority {
    factor: 'price' | 'performance' | 'battery' | 'design' | 'brand' | 'reviews';
    weight: number;
}
export interface Feedback {
    id: string;
    user_id?: string;
    recommendation_id: string;
    rating: number;
    helpful: boolean;
    comment?: string;
    created_at: string;
}
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
    offset?: number;
    hasMore?: boolean;
}
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
export declare class AppError extends Error {
    statusCode: number;
    code: string;
    details?: any;
    constructor(message: string, statusCode?: number, code?: string, details?: any);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: any);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export type DatabaseTable = 'gadgets' | 'reviews' | 'recommendations' | 'specs_normalized' | 'benchmarks' | 'embeddings' | 'users' | 'user_preferences' | 'feedback' | 'scraping_jobs';
export type SortOrder = 'asc' | 'desc';
export type SkillLevel = 'beginner' | 'intermediate' | 'expert';
export type ReviewSource = 'amazon' | 'reddit' | 'youtube' | 'manual';
export interface User {
    id: string;
    auth_id: string;
    email: string;
    display_name?: string;
    preferences?: UserPreferences;
    created_at: string;
    updated_at: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationInfo;
    success: boolean;
    message?: string;
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
}
export interface SearchFilters {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    tags?: string[];
    availability?: 'in_stock' | 'out_of_stock' | 'all';
}
export interface RecommendationResult extends Recommendation {
    summary?: string;
    pros?: string[];
    cons?: string[];
    score?: number;
    sources?: {
        type: string;
        id: any;
        excerpt: string;
    }[];
    alternatives?: {
        gadget_id: any;
        reason: string;
        score: number;
    }[];
    metadata?: {
        processing_time: number;
        model_version: string;
        context_tokens: number;
    };
}
export interface UserProfile {
    user_id: string;
    expertise_level: 'beginner' | 'intermediate' | 'expert';
    interface_complexity_preference: number;
    preferred_interaction_style: 'guided' | 'exploratory' | 'direct';
    learned_preferences: Record<string, any>;
    technical_interests: Record<string, number>;
    spec_detail_preference: number;
}
export interface ConversationSession {
    id: string;
    user_id: string;
    session_goal: string;
    current_phase: 'discovery' | 'refinement' | 'recommendation' | 'completed';
    interaction_history: ConversationTurn[];
    adaptive_context: Record<string, any>;
    created_at: string;
    updated_at: string;
}
export interface ConversationTurn {
    id: string;
    session_id: string;
    user_message: string;
    ai_response: string;
    ui_adaptations: UIAdaptation[];
    confidence_score: number;
    timestamp: string;
}
export interface UIAdaptation {
    component: string;
    property: string;
    value: any;
    reason: string;
    confidence: number;
}
export interface AdaptiveRecommendation {
    laptop_id: string;
    overall_score: number;
    ai_reasoning: string;
    reasoning_complexity_level: number;
    personalized_highlights: any[];
    budget_fit_explanation: string;
    use_case_alignment: Record<string, any>;
}
export interface UIConfiguration {
    layout: {
        view_mode: 'grid' | 'list' | 'cards';
        density: 'compact' | 'normal' | 'spacious';
        sidebar_visible: boolean;
    };
    filters: {
        visible_filters: string[];
        advanced_filters_visible: boolean;
        filter_complexity: 'simple' | 'intermediate' | 'advanced';
    };
    content: {
        spec_detail_level: 'basic' | 'detailed' | 'expert';
        show_benchmarks: boolean;
        show_technical_details: boolean;
        comparison_mode: 'simple' | 'detailed' | 'technical';
    };
    recommendations: {
        explanation_depth: 'brief' | 'moderate' | 'detailed';
        show_alternatives: boolean;
        highlight_technical: boolean;
    };
    interaction: {
        chat_complexity: 'conversational' | 'technical' | 'expert';
        suggested_questions_complexity: number;
        enable_deep_dive_mode: boolean;
    };
}
