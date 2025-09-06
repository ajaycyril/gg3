import { Request, Response, NextFunction } from 'express';
export interface ErrorWithStatus extends Error {
    status?: number;
    code?: string;
    details?: any;
}
export declare const errorHandler: (err: ErrorWithStatus, req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
