import { randomInt } from "crypto";
import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import { signToken } from "../lib/jwt";
import { emailOtpKey, sendEmailOTP } from "../lib/mail";
import { EMAIL_OTP_TTL_MINUTES, deleteOTP, emailResendWaitSeconds, setOTP, verifyOTP } from "../lib/otpStore";
import prisma from "../lib/prisma";
import { rateLimit } from "../lib/rateLimit";

const router = Router();

// Public signup used to create a GYM_OWNER with no approval.
// Partner access is granted when an admin approves a gym application.
router.post("/signup", (_req: Request, res: Response): void => {
  res.status(403).json({
    error: "SignupClosed",
    message: "Gym partner accounts are created when ZonoFit approves a gym application. Sign in if you already have one.",
  });
});

// POST /api/auth/portal/signin
router.post(
  "/signin",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isString(),
    body("code").optional().isString().trim().matches(/^\d{4}$/),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
      }

      const { email, password, code } = req.body as { email: string; password: string; code?: string };

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

      if (user.isSuspended) {
        res.status(403).json({ error: "AccountSuspended", message: "Your account has been suspended by an administrator." });
        return;
      }

      // Check if they are allowed to login here
      if (user.systemRole === "MEMBER") {
        res.status(403).json({ error: "AccessDenied", message: "Standard members cannot access the portal." });
        return;
      }

      const otpKey = emailOtpKey(email);
      if (!code) {
        const wait = await emailResendWaitSeconds(otpKey);
        if (wait > 0) {
          const minutes = Math.max(1, Math.ceil(wait / 60));
          res.status(429).json({
            error: "ResendTooSoon",
            message: `Wait ${minutes} minute${minutes === 1 ? "" : "s"} before requesting another code.`,
            retryAfterSeconds: wait,
          });
          return;
        }
        if (!(await rateLimit(`email-otp:${otpKey}`, 5, 15 * 60 * 1000))) {
          res.status(429).json({ error: "TooManyRequests", message: "Too many code requests. Wait a few minutes and try again." });
          return;
        }
        const otp = randomInt(1000, 10000).toString();
        await setOTP(otpKey, otp, EMAIL_OTP_TTL_MINUTES);
        const sent = await sendEmailOTP(email, otp);
        if (!sent) {
          await deleteOTP(otpKey);
          res.status(503).json({ error: "EmailNotConfigured", message: "Could not email a verification code. Try again shortly." });
          return;
        }
        res.json({ otpRequired: true, message: "Enter the 4-digit code sent to your email. It works for 10 minutes." });
        return;
      }

      if (!(await rateLimit(`email-verify:${otpKey}`, 8, 15 * 60 * 1000))) {
        res.status(429).json({ error: "TooManyRequests", message: "Too many attempts. Request a new code." });
        return;
      }
      const allowDevCode = process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_OTP === "true";
      const isValid = (await verifyOTP(otpKey, code)) || (allowDevCode && code === "1234");
      if (!isValid) {
        res.status(400).json({ error: "InvalidCode", message: "Invalid or expired verification code." });
        return;
      }

      const token = signToken({
        dbUserId: user.id,
        systemRole: user.systemRole,
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
    } catch (err: any) {
      console.error("[AuthPortal Signin Error]", err);
      res.status(500).json({ error: "InternalServerError", message: err.message || "Signin failed." });
    }
  }
);

export default router;
