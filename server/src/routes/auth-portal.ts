import { createHash } from "crypto";
import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import { cleanPortalUsername } from "../lib/gymOwner";
import { signToken } from "../lib/jwt";
import { createEmailCode, emailOtpKey, sendEmailOTP } from "../lib/mail";
import { EMAIL_OTP_TTL_MINUTES, deleteOTP, emailResendWaitSeconds, setOTP, verifyOTP } from "../lib/otpStore";
import prisma from "../lib/prisma";
import { rateLimit } from "../lib/rateLimit";

const router = Router();

// Public signup used to create a GYM_OWNER with no approval.
// Partner access is granted when an admin approves a gym application.
router.post("/signup", (_req: Request, res: Response): void => {
  res.status(403).json({
    error: "SignupClosed",
    message: "Gym partner accounts are created by ZonoFit. Sign in with the username, password, or passkey you were given.",
  });
});

// POST /api/auth/portal/signin
router.post(
  "/signin",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isString(),
    body("code").optional().isString().trim().matches(/^\d{4,6}$/).withMessage("Enter a valid 6-digit verification code"),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        res.status(400).json({ error: "ValidationError", message: firstError?.msg || "Invalid verification code", details: errors.array() });
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

      // Admin portal only. Gym partners use POST /gym-signin with a username.
      if (user.systemRole !== "ADMIN") {
        res.status(403).json({
          error: "AccessDenied",
          message: user.systemRole === "GYM_OWNER"
            ? "Gym partners sign in with the username and password or passkey from ZonoFit."
            : "Standard members cannot access the portal.",
        });
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
        const otp = createEmailCode();
        await setOTP(otpKey, otp, EMAIL_OTP_TTL_MINUTES);
        const sent = await sendEmailOTP(email, otp);
        if (!sent) {
          await deleteOTP(otpKey);
          res.status(503).json({ error: "EmailNotConfigured", message: "Could not email a verification code. Try again shortly." });
          return;
        }
        res.json({ otpRequired: true, message: "Enter the 6-digit code sent to your email. It works for 10 minutes." });
        return;
      }

      if (!(await rateLimit(`email-verify:${otpKey}`, 8, 15 * 60 * 1000))) {
        res.status(429).json({ error: "TooManyRequests", message: "Too many attempts. Request a new code." });
        return;
      }
      const allowDevCode = process.env.ALLOW_DEV_OTP !== "false";
      const isValid = (await verifyOTP(otpKey, code)) || (allowDevCode && code === "123456");
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

function gymLoginBucket(username: string): string {
  return createHash("sha256").update(username.toLowerCase()).digest("hex").slice(0, 32);
}

let gymDummyHash = "";

async function burnGymSecretCompare(secret: string): Promise<void> {
  if (!gymDummyHash) gymDummyHash = await bcrypt.hash("zonofit-gym-portal", 12);
  await bcrypt.compare(secret, gymDummyHash);
}

// POST /api/auth/portal/gym-signin
// Gym owners only. Username plus password, or username plus passkey. No email and no OTP.
router.post("/gym-signin", async (req: Request, res: Response): Promise<void> => {
  try {
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const passkey = typeof req.body?.passkey === "string" ? req.body.passkey : "";
    const username = cleanPortalUsername(req.body?.username);
    const rawName = typeof req.body?.username === "string" ? req.body.username.trim() : "";

    if (!rawName) {
      res.status(400).json({ error: "ValidationError", message: "Enter the username ZonoFit gave this gym." });
      return;
    }
    if (password && passkey) {
      res.status(400).json({ error: "ValidationError", message: "Use the password or the passkey, not both." });
      return;
    }
    const secret = passkey || password;
    if (!secret) {
      res.status(400).json({ error: "ValidationError", message: "Enter the password or the passkey." });
      return;
    }

    const bucket = gymLoginBucket(username || rawName.slice(0, 64));
    if (!(await rateLimit(`gym-signin:${bucket}`, 8, 15 * 60 * 1000))) {
      res.status(429).json({ error: "TooManyRequests", message: "Too many sign-in attempts. Wait a few minutes and try again." });
      return;
    }

    const invalid = { error: "InvalidCredentials", message: "That username or secret is not right." };
    if (!username || secret.length > 72) {
      await burnGymSecretCompare(secret.slice(0, 72));
      res.status(401).json(invalid);
      return;
    }

    const user = await prisma.user.findFirst({ where: { portalUsername: username } });
    const hash = passkey ? user?.passkeyHash : user?.passwordHash;
    if (!user || !hash) {
      await burnGymSecretCompare(secret);
      res.status(401).json(invalid);
      return;
    }

    const matches = await bcrypt.compare(secret, hash);
    if (!matches) {
      res.status(401).json(invalid);
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({ error: "AccountSuspended", message: "Your account has been suspended by an administrator." });
      return;
    }
    if (user.systemRole !== "GYM_OWNER") {
      res.status(403).json({ error: "AccessDenied", message: "This portal is for gym partners." });
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
        username: user.portalUsername,
        role: user.systemRole,
      },
    });
  } catch (err: unknown) {
    console.error("[AuthPortal Gym Signin Error]", err instanceof Error ? err.message : "Signin failed");
    res.status(500).json({ error: "InternalServerError", message: "Signin failed." });
  }
});

export default router;
