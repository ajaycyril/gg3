import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
declare class DatabaseClient {
    private static instance;
    private client;
    private adminClient;
    private connectionPool;
    private maxConnections;
    private connectionTimeout;
    private lastActivity;
    private constructor();
    private setupServerlessCleanup;
    static getInstance(): DatabaseClient;
    getClient(accessToken?: string): SupabaseClient<Database>;
    getAdminClient(): SupabaseClient<Database>;
    healthCheck(): Promise<boolean>;
    executeQuery<T = any>(tableName: string, operation: string, queryBuilder: (query: any) => any, useAdmin?: boolean): Promise<{
        data: T | null;
        error: any;
    }>;
    executeQuery(queryBuilder: any): Promise<{
        data: any;
        error: any;
    }>;
    getPaginatedResults<T>(tableName: string, page?: number, limit?: number, queryBuilder?: (query: any) => any, useAdmin?: boolean): Promise<{
        data: T[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        error?: any;
    }>;
    bulkInsert<T>(tableName: string, records: T[], chunkSize?: number, // Smaller chunks for V0 serverless
    useAdmin?: boolean): Promise<{
        success: boolean;
        insertedCount: number;
        errors: any[];
    }>;
    vectorSimilaritySearch(vector: number[], limit?: number, threshold?: number): Promise<{
        data: any[];
        error?: any;
    }>;
    processBatch<T, R>(items: T[], processor: (item: T) => Promise<R>, options?: {
        batchSize?: number;
        maxConcurrent?: number;
        retryCount?: number;
        delayMs?: number;
    }): Promise<{
        results: R[];
        errors: any[];
    }>;
    cleanup(): Promise<void>;
    checkSecurityThreat(ip: string): Promise<boolean>;
    enforceRateLimit(userId: string, action: string, limit?: number): Promise<boolean>;
    executeSecureQuery<T>(tableName: string, operation: 'select' | 'insert' | 'update' | 'delete', queryBuilder: (query: any) => any, context?: {
        userId?: string;
        ipAddress?: string;
        userAgent?: string;
    }, useAdmin?: boolean): Promise<{
        data: T | null;
        error: any;
    }>;
    bulkInsertLaptops(laptops: any[], options?: {
        validateSpecs?: boolean;
        deduplication?: boolean;
        batchSize?: number;
    }): Promise<{
        success: boolean;
        insertedCount: number;
        errors: any[];
        duplicates: any[];
    }>;
    findSimilarLaptops(queryVector: number[], filters?: {
        budget?: {
            min: number;
            max: number;
        };
        brand?: string[];
        category?: string;
        minRating?: number;
    }, limit?: number): Promise<{
        data: any[];
        error?: any;
    }>;
    private calculateLaptopScore;
}
export declare const db: DatabaseClient;
export declare const supabase: SupabaseClient<Database, "public", any>;
export declare const supabaseAdmin: SupabaseClient<Database, "public", any>;
export {};
