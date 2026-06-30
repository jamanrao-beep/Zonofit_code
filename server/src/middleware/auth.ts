import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

// Extend Express Request to carry the verified user
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
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Missing or malformed Authorization header.",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify token payload locally using build-in crypto
    const payload = verifyToken(token);

    if (!payload || !payload.dbUserId) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired session token.",
      });
      return;
    }

    req.dbUserId = payload.dbUserId;
    next();
  } catch (err) {
    console.error("[requireAuth] Token verification error:", err);
    res.status(401).json({
      error: "Unauthorized",
      message: "Token verification failed.",
    });
  }
}

