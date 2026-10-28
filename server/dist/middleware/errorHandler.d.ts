import { Request, Response, NextFunction } from "express";
export interface AppError extends Error {
    statusCode?: number;
    code?: string;
}
/**
 * Global error handler — catches anything thrown in route handlers.
 * Always returns structured JSON so the mobile app can parse errors uniformly.
 */
export declare function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void;
/**
 * 404 handler — catches unmatched routes.
 */
export declare function notFoundHandler(req: Request, res: Response): void;
/**
 * Helper to create a typed error with an HTTP status code.
 */
export declare function createError(message: string, statusCode: number, code?: string): AppError;
//# sourceMappingURL=errorHandler.d.ts.map