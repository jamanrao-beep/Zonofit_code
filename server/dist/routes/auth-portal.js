"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const jwt_1 = require("../lib/jwt");
const prisma_1 = __importDefault(require("../lib/prisma"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const router = (0, express_1.Router)();
// POST /api/auth/portal/signup
router.post("/signup", [
    (0, express_validator_1.body)("email").isEmail().normalizeEmail(),
    (0, express_validator_1.body)("password").isString().isLength({ min: 6 }),
    (0, express_validator_1.body)("name").isString().trim().isLength({ min: 2 }),
    (0, express_validator_1.body)("role").isIn(["GYM_OWNER"]),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ error: "ValidationError", details: errors.array() });
            return;
        }
        const { email, password, name, role } = req.body;
        const existingUser = await prisma_1.default.user.findFirst({
            where: { email },
        });
        if (existingUser) {
            res.status(400).json({ error: "EmailAlreadyRegistered", message: "This email is already registered." });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: {
                email,
                name,
                passwordHash,
                systemRole: role,
            },
        });
        const token = (0, jwt_1.signToken)({
            dbUserId: user.id,
            systemRole: user.systemRole,
            createdAt: Date.now(),
        });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.systemRole,
            },
        });
    }
    catch (err) {
        console.error("[AuthPortal Signup Error]", err);
        res.status(500).json({ error: "InternalServerError", message: err.message || "Signup failed." });
    }
});
// POST /api/auth/portal/signin
router.post("/signin", [
    (0, express_validator_1.body)("email").isEmail().normalizeEmail(),
    (0, express_validator_1.body)("password").isString(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ error: "ValidationError", details: errors.array() });
            return;
        }
        const { email, password } = req.body;
        const user = await prisma_1.default.user.findFirst({
            where: { email },
        });
        if (!user || !user.passwordHash) {
            res.status(401).json({ error: "InvalidCredentials", message: "Invalid email or password." });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ error: "InvalidCredentials", message: "Invalid email or password." });
            return;
        }
        if (user.isSuspended) {
            res.status(403).json({ error: "AccountSuspended", message: "Your account has been suspended by an administrator." });
            return;
        }
        // Check if they are allowed to login here
        if (user.systemRole === "MEMBER") {
            res.status(403).json({ error: "AccessDenied", message: "Standard members cannot access the portal." });
            return;
        }
        const token = (0, jwt_1.signToken)({
            dbUserId: user.id,
            systemRole: user.systemRole,
            createdAt: Date.now(),
        });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.systemRole,
            },
        });
    }
    catch (err) {
        console.error("[AuthPortal Signin Error]", err);
        res.status(500).json({ error: "InternalServerError", message: err.message || "Signin failed." });
    }
});
exports.default = router;
//# sourceMappingURL=auth-portal.js.map