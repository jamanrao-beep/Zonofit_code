import { createClerkClient, verifyToken } from "@clerk/backend";
import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

// Extend Express Request to carry the verified user
declare global {
  namespace Express {
    interface Request {
      clerkUserId?: string;
      dbUserId?: string;
    }
  }
}

/**
 * requireAuth — Express middleware
 *
 * 1. Extracts the Bearer token from Authorization header
 * 2. Verifies it with Clerk (server-side, uses secret key)
 * 3. Looks up the corresponding User row in our DB
 * 4. Attaches clerkUserId and dbUserId to req for downstream handlers
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

    // Verify with Clerk — this hits Clerk's JWKS endpoint
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    if (!payload?.sub) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired session token.",
      });
      return;
    }

    req.clerkUserId = payload.sub;

    // Look up our internal user row
    const user = await prisma.user.findUnique({
      where: { clerkId: payload.sub },
      select: { id: true },
    });

    if (!user) {
      // User exists in Clerk but not yet synced to our DB
      // This happens if the Clerk webhook hasn't fired yet
      res.status(401).json({
        error: "UserNotFound",
        message:
          "User account not found. Please try again or contact support.",
      });
      return;
    }

    req.dbUserId = user.id;
    next();
  } catch (err) {
    console.error("[requireAuth] Token verification error:", err);
    res.status(401).json({
      error: "Unauthorized",
      message: "Token verification failed.",
    });
  }
}
