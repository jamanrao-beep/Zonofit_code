"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
const jwt_1 = require("../lib/jwt");
const prisma_1 = __importDefault(require("../lib/prisma"));
/**
 * requireAuth — Express middleware
 *
 * 1. Extracts the Bearer token from Authorization header
 * 2. Verifies it using custom verifyToken helper
 * 3. Attaches dbUserId to req for downstream handlers
 *
 * If any step fails → 401 Unauthorized
 */
async function requireAuth(req, res, next) {
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
        const payload = (0, jwt_1.verifyToken)(token);
        if (!payload || !payload.dbUserId) {
            res.status(401).json({
                error: "Unauthorized",
                message: "Invalid or expired session token.",
            });
            return;
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: payload.dbUserId },
            select: { isSuspended: true }
        });
        if (!user) {
            res.status(401).json({ error: "Unauthorized", message: "User not found." });
            return;
        }
        if (user.isSuspended) {
            res.status(403).json({ error: "AccountSuspended", message: "Your account has been suspended by an administrator." });
            return;
        }
        req.dbUserId = payload.dbUserId;
        next();
    }
    catch (err) {
        console.error("[requireAuth] Token verification error:", err);
        res.status(401).json({
            error: "Unauthorized",
            message: "Token verification failed.",
        });
    }
}
/**
 * optionalAuth — Express middleware
 * Extracts token if provided, but does not block guests if omitted or invalid.
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const payload = (0, jwt_1.verifyToken)(token);
            if (payload && payload.dbUserId) {
                req.dbUserId = payload.dbUserId;
            }
        }
    }
    catch (err) {
        // Guest or expired token — proceed without dbUserId
    }
    next();
}
//# sourceMappingURL=auth.js.map