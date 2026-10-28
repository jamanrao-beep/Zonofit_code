import { Request, Response, NextFunction } from "express";
declare global {
    namespace Express {
        interface Request {
            dbUserId?: string;
        }
    }
}
/**
 * requireAuth — Express middleware
 *
 * 1. Extracts the Bearer token from Authorization header
 * 2. Verifies it using custom verifyToken helper
 * 3. Attaches dbUserId to req for downstream handlers
 *
 * If any step fails → 401 Unauthorized
 */
export declare function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * optionalAuth — Express middleware
 * Extracts token if provided, but does not block guests if omitted or invalid.
 */
export declare function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.d.ts.map