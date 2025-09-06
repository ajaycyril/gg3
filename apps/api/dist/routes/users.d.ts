import { Router } from 'express';
declare const router: Router;
export default router;
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email?: string;
                user_metadata?: {
                    full_name?: string;
                    avatar_url?: string;
                    display_name?: string;
                    [key: string]: any;
                };
            };
        }
    }
}
