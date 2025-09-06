import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            tenant?: TenantContext;
        }
    }
}
interface TenantContext {
    tenant_id: string;
    tenant: {
        id: string;
        name: string;
        slug: string;
        quotas: Record<string, any>;
    };
    api_key?: {
        id: string;
        name: string;
        scopes: string[];
        quotas: Record<string, any>;
    };
}
/**
 * Tenant middleware for multi-tenant API access control
 */
export declare const tenantMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export {};
