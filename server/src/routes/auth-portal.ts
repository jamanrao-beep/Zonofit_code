import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import { signToken } from "../lib/jwt";
import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";
import { SystemRole } from "@prisma/client";

const router = Router();

// POST /api/auth/portal/signup
router.post(
  "/signup",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isString().isLength({ min: 6 }),
    body("name").isString().trim().isLength({ min: 2 }),
    body("role").isIn(["GYM_OWNER"]),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { email, password, name, role } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: "EmailAlreadyRegistered", message: "This email is already registered." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        systemRole: role as SystemRole,
      },
    });

    const token = signToken({
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
);

// POST /api/auth/portal/signin
router.post(
  "/signin",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { email, password } = req.body;

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "InvalidCredentials", message: "Invalid email or password." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      res.status(401).json({ error: "InvalidCredentials", message: "Invalid email or password." });
      return;
    }

    // Check if they are allowed to login here
    if (user.systemRole === "MEMBER") {
      res.status(403).json({ error: "AccessDenied", message: "Standard members cannot access the portal." });
      return;
    }

    const token = signToken({
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
);

export default router;
