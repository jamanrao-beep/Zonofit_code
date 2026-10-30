import { randomInt } from "crypto";
import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import { signToken } from "../lib/jwt";
import prisma from "../lib/prisma";
import { normalizePhone } from "../lib/phone";
import { sendOTP } from "../lib/sms";
import { emailOtpKey, sendEmailOTP } from "../lib/mail";
import { EMAIL_OTP_TTL_MINUTES, deleteOTP, emailResendWaitSeconds, setOTP, verifyOTP } from "../lib/otpStore";
import { generateUniqueReferralCode } from "../lib/referral";
import { rateLimit } from "../lib/rateLimit";
import { optionalAuth, requireAuth } from "../middleware/auth";

const router = Router();

function readPhone(req: Request, res: Response): string | null {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) {
    res.status(400).json({ error: "InvalidPhone", message: "Enter a valid 10-digit mobile number." });
    return null;
  }
  return phone;
}

// POST /api/auth/signup
router.post(
  "/signup",
  [
    body("username").isString().trim().isLength({ min: 2, max: 50 }),
    body("phone").isString().trim().isLength({ min: 10, max: 20 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const phone = readPhone(req, res);
    if (!phone) return;
    const { username } = req.body;

    // Check if phone already registered
    const existingUser = await prisma.user.findFirst({
      where: { phone },
    });

    if (existingUser) {
      res.status(400).json({ error: "PhoneAlreadyRegistered", message: "This phone number is already registered." });
      return;
    }

    if (!(await rateLimit(`otp:${phone}`, 5, 15 * 60 * 1000))) {
      res.status(429).json({ error: "TooManyRequests", message: "Too many code requests. Wait a few minutes and try again." });
      return;
    }

    const code = randomInt(1000, 10000).toString();
    await setOTP(phone, code);

    const sent = await sendOTP(phone, code);

    if (sent) {
      res.json({ success: true, message: "OTP sent successfully." });
    } else {
      res.status(500).json({ error: "SMSFailed", message: "Failed to send OTP SMS." });
    }
  }
);

// POST /api/auth/signin
router.post(
  "/signin",
  [
    body("phone").isString().trim().isLength({ min: 10, max: 20 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const phone = readPhone(req, res);
    if (!phone) return;

    const user = await prisma.user.findFirst({
      where: { phone },
    });

    if (!user) {
      res.status(404).json({ error: "UserNotFound", message: "No user found with this phone number." });
      return;
    }

    if (!(await rateLimit(`otp:${phone}`, 5, 15 * 60 * 1000))) {
      res.status(429).json({ error: "TooManyRequests", message: "Too many code requests. Wait a few minutes and try again." });
      return;
    }

    const code = randomInt(1000, 10000).toString();
    await setOTP(phone, code);

    const sent = await sendOTP(phone, code);

    if (sent) {
      res.json({ success: true, message: "OTP sent successfully." });
    } else {
      res.status(500).json({ error: "SMSFailed", message: "Failed to send OTP SMS." });
    }
  }
);

// POST /api/auth/check-user
router.post(
  "/check-user",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone, email } = req.body || {};
      const cleanPhone = normalizePhone(phone);
      const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

      let phoneUser = null;
      if (cleanPhone) {
        phoneUser = await prisma.user.findFirst({
          where: { phone: cleanPhone },
          select: { id: true, name: true, phone: true, email: true },
        });
      }

      let emailUser = null;
      if (cleanEmail && cleanEmail.includes("@")) {
        emailUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
          select: { id: true, name: true, phone: true, email: true },
        });
      }

      const matchedUser = phoneUser || emailUser;
      res.json({
        exists: !!matchedUser,
        phoneExists: !!phoneUser,
        emailExists: !!emailUser,
        isOnboarded: !!(matchedUser && matchedUser.name && matchedUser.name !== "ZonoFit Member"),
      });
    } catch (err: any) {
      res.status(500).json({ error: "CheckUserFailed", message: err.message });
    }
  }
);

// POST /api/auth/verify
router.post(
  "/verify",
  optionalAuth,
  [
    body("phone").isString().trim(),
    body("code").isString().trim(),
    body("isSignIn").isBoolean(),
    body("username").optional().isString().trim(),
    body("referralCode").optional().isString().trim(),
    body("attachPhone").optional().isBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const phone = readPhone(req, res);
    if (!phone) return;
    const { code, isSignIn, username, referralCode: inputRefCode } = req.body;

    if (!(await rateLimit(`verify:${phone}`, 8, 15 * 60 * 1000))) {
      res.status(429).json({ error: "TooManyRequests", message: "Too many attempts. Request a new code." });
      return;
    }

    const allowDevCode = process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_OTP === "true";
    const isValid = (await verifyOTP(phone, code)) || (allowDevCode && code === "1234");

    if (!isValid) {
      res.status(400).json({ error: "InvalidCode", message: "Invalid or expired verification code." });
      return;
    }

    let user;

    // Google already opened this account. The code proves the mobile number,
    // then we save it on that same user instead of creating a second account.
    if (req.body?.attachPhone === true) {
      if (!req.dbUserId) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Open Google or verify this code to create the account first.",
        });
        return;
      }
      const taken = await prisma.user.findFirst({
        where: { phone, NOT: { id: req.dbUserId } },
        select: { id: true },
      });
      if (taken) {
        res.status(409).json({
          error: "PhoneInUse",
          message: "That phone number is already on another account. Sign in with it instead.",
        });
        return;
      }
      user = await prisma.user.update({
        where: { id: req.dbUserId },
        data: { phone },
        include: { wallet: true, membership: true },
      });
      const token = signToken({ dbUserId: user.id, phone: user.phone || undefined });
      const realName = !!(user.name && user.name !== "ZonoFit Member" && user.name !== "Google User");
      const isOnboarded = realName && !!user.membership?.primaryGymId;
      res.json({
        token,
        user: {
          id: user.id,
          username: user.name,
          phone: user.phone,
          email: user.email,
          authMethod: "phone",
          isOnboarded,
        },
        isOnboarded,
      });
      return;
    }

    if (isSignIn) {
      user = await prisma.user.findFirst({
        where: { phone },
        include: {
          wallet: true,
          membership: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: "UserNotFound", message: "User not found." });
        return;
      }

      if (user.isSuspended) {
        res.status(403).json({ error: "AccountSuspended", message: "Your account has been suspended by an administrator." });
        return;
      }
    } else {
      // Signup flow
      const settings = await prisma.systemSettings.findUnique({ where: { id: "default" } });
      if (settings && !settings.signupsEnabled) {
        res.status(403).json({ error: "SignupsDisabled", message: "New signups are currently disabled." });
        return;
      }

      if (!username) {
        res.status(400).json({ error: "UsernameRequired", message: "Username is required for signup." });
        return;
      }

      // Check duplicate phone or username
      const dupUser = await prisma.user.findFirst({
        where: { OR: [{ phone }, { email: `${username.toLowerCase()}_${phone}@zonofit.com` }] },
      });

      if (dupUser) {
        res.status(400).json({ error: "UserAlreadyExists", message: "Username or phone number already registered." });
        return;
      }

      const email = `${username.toLowerCase()}_${phone}@zonofit.com`;

      // Fetch Premium membership plan to auto-grant to new users for testing
      const premiumPlan = await prisma.membershipPlan.findFirst({
        where: { name: "Premium" },
      });

      let referredByUserId: string | undefined = undefined;
      if (inputRefCode && typeof inputRefCode === "string") {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: inputRefCode.trim().toUpperCase() },
        });
        if (referrer) {
          referredByUserId = referrer.id;
        }
      }

      const uniqueReferralCode = await generateUniqueReferralCode();

      try {
        user = await prisma.user.create({
          data: {
            email,
            name: username,
            phone,
            referralCode: uniqueReferralCode,
            referredByUserId,
            wallet: {
              create: {
                balance: 0,
                convertibleCashBalanceInPaise: 0,
                nonConvertibleCashBalanceInPaise: 0,
              },
            },
          },
          include: {
            wallet: true,
            membership: true,
          },
        });
      } catch (err: unknown) {
        if ((err as { code?: string }).code === "P2002") {
          res.status(409).json({ error: "UserAlreadyExists", message: "Username or phone number already registered." });
          return;
        }
        throw err;
      }
    }

    // Generate custom JWT token
    const token = signToken({
      dbUserId: user.id,
      phone: user.phone || undefined,
    });

    const isOnboarded = !!(user.name && user.name !== "ZonoFit Member");

    res.json({
      token,
      user: {
        id: user.id,
        username: user.name,
        phone: user.phone,
        email: user.email,
        authMethod: "phone",
        isOnboarded,
      },
      isOnboarded,
    });
  }
);

// POST /api/auth/google
// Accepts only a Google ID token. An email typed into the app is not proof of identity.
router.post("/google", async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, referralCode: inputRefCode } = req.body || {};
    if (!idToken || typeof idToken !== "string") {
      res.status(400).json({
        error: "GoogleTokenRequired",
        message: "Sign in with your phone number. Google sign-in needs a verified Google token, which this build does not send.",
      });
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      res.status(503).json({ error: "GoogleNotConfigured", message: "Google sign-in is not configured. Use your phone number." });
      return;
    }

    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!googleRes.ok) {
      res.status(401).json({ error: "InvalidGoogleToken", message: "Google could not verify this sign-in." });
      return;
    }
    const google = await googleRes.json() as { aud?: string; email?: string; email_verified?: string; name?: string };
    if (google.aud !== clientId || google.email_verified !== "true" || !google.email) {
      res.status(401).json({ error: "InvalidGoogleToken", message: "Google could not verify this sign-in." });
      return;
    }

    const email = google.email.trim().toLowerCase();
    const name = google.name || email.split("@")[0] || "Google User";

    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (existingUser && existingUser.isSuspended) {
      res.status(403).json({ error: "AccountSuspended", message: "Your account has been suspended by an administrator." });
      return;
    }

    if (!existingUser) {
      const settings = await prisma.systemSettings.findUnique({ where: { id: "default" } });
      if (settings && !settings.signupsEnabled) {
        res.status(403).json({ error: "SignupsDisabled", message: "New signups are currently disabled." });
        return;
      }
    }

    let referredByUserId: string | undefined = undefined;
    if (inputRefCode && typeof inputRefCode === "string") {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: inputRefCode.trim().toUpperCase() },
      });
      if (referrer) {
        referredByUserId = referrer.id;
      }
    }

    const uniqueReferralCode = await generateUniqueReferralCode();

    //  Use upsert so clicking Google twice doesn't crash
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
        referralCode: uniqueReferralCode,
        referredByUserId,
        wallet: {
          create: {
            balance: 0,
            convertibleCashBalanceInPaise: 0,
            nonConvertibleCashBalanceInPaise: 0,
          },
        },
      },
      include: { wallet: true, membership: true },
    });

    const token = signToken({ dbUserId: user.id });

    const hasMembership = !!user.membership;
    const hasPrimaryGym = !!(user.membership && user.membership.primaryGymId);
    const isOnboarded = !!(user.name && user.name !== "Google User" && user.name !== "ZonoFit Member" && hasPrimaryGym);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.name,
        phone: user.phone || "",
        email: user.email,
        authMethod: "google",
        isOnboarded,
        primaryGymId: user.membership?.primaryGymId || null,
      },
      isOnboarded,
    });
  } catch (err: any) {
    console.error("[Google Auth Error]", err);
    res.status(500).json({ error: "GoogleAuthFailed", message: "Google sign-in failed." });
  }
});

function cleanEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return null;
  return email;
}

// POST /api/auth/email-otp/send
// Used while a member is registering an email address. The code goes to that inbox.
router.post("/email-otp/send", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const email = cleanEmail(req.body?.email);
  if (!email) {
    res.status(400).json({ error: "InvalidEmail", message: "Enter a valid email address." });
    return;
  }
  const otpKey = emailOtpKey(email);
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
  const code = randomInt(1000, 10000).toString();
  await setOTP(otpKey, code, EMAIL_OTP_TTL_MINUTES);
  const sent = await sendEmailOTP(email, code);
  if (!sent) {
    await deleteOTP(otpKey);
    res.status(503).json({ error: "EmailNotConfigured", message: "Could not email a verification code. Try again shortly." });
    return;
  }
  res.json({ success: true, message: "Enter the 4-digit code sent to your email. It works for 10 minutes." });
});

// POST /api/auth/email-otp/verify
router.post("/email-otp/verify", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const email = cleanEmail(req.body?.email);
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!email || !/^\d{4}$/.test(code)) {
    res.status(400).json({ error: "InvalidCode", message: "Enter the 4-digit code from your email." });
    return;
  }
  const otpKey = emailOtpKey(email);
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
  // Proof that this signed-in member verified this inbox. Profile save consumes it.
  await setOTP(`verified-email:${req.dbUserId}`, email, 30);
  res.json({ verified: true, email });
});

export default router;
