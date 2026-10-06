import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import { signToken } from "../lib/jwt";
import prisma from "../lib/prisma";
import { sendOTP } from "../lib/sms";
import { setOTP, verifyOTP } from "../lib/otpStore";
import { generateUniqueReferralCode } from "../lib/referral";

const router = Router();

// POST /api/auth/signup
router.post(
  "/signup",
  [
    body("username").isString().trim().isLength({ min: 2, max: 50 }),
    body("phone").isString().trim().isLength({ min: 10, max: 15 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { username, phone } = req.body;

    // Check if phone already registered
    const existingUser = await prisma.user.findFirst({
      where: { phone },
    });

    if (existingUser) {
      res.status(400).json({ error: "PhoneAlreadyRegistered", message: "This phone number is already registered." });
      return;
    }

    const isRealSMS = !!process.env.FAST2SMS_API_KEY;
    const code = (!isRealSMS && process.env.NODE_ENV === "development") 
      ? "1234" 
      : Math.floor(1000 + Math.random() * 9000).toString();
    setOTP(phone, code);
    
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
    body("phone").isString().trim().isLength({ min: 10, max: 15 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { phone } = req.body;

    const user = await prisma.user.findFirst({
      where: { phone },
    });

    if (!user) {
      res.status(404).json({ error: "UserNotFound", message: "No user found with this phone number." });
      return;
    }

    const isRealSMS = !!process.env.FAST2SMS_API_KEY;
    const code = (!isRealSMS && process.env.NODE_ENV === "development") 
      ? "1234" 
      : Math.floor(1000 + Math.random() * 9000).toString();
    setOTP(phone, code);

    const sent = await sendOTP(phone, code);

    if (sent) {
      res.json({ success: true, message: "OTP sent successfully." });
    } else {
      res.status(500).json({ error: "SMSFailed", message: "Failed to send OTP SMS." });
    }
  }
);

// POST /api/auth/verify
router.post(
  "/verify",
  [
    body("phone").isString().trim(),
    body("code").isString().trim(),
    body("isSignIn").isBoolean(),
    body("username").optional().isString().trim(),
    body("referralCode").optional().isString().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const { phone, code, isSignIn, username, referralCode: inputRefCode } = req.body;

    const isDev = process.env.NODE_ENV === "development" || !process.env.FAST2SMS_API_KEY;
    const isValid = verifyOTP(phone, code) || (isDev && (code === "1234" || code === "123456"));

    if (!isValid) {
      res.status(400).json({ error: "InvalidCode", message: "Invalid or expired verification code." });
      return;
    }

    let user;

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
    }

    // Generate custom JWT token
    const token = signToken({
      dbUserId: user.id,
      phone: user.phone || undefined,
      createdAt: Date.now(),
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.name,
        phone: user.phone,
        authMethod: "phone",
      },
    });
  }
);

// POST /api/auth/google
router.post("/google", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email: bodyEmail, name: bodyName, referralCode: inputRefCode } = req.body || {};
    
    if (!bodyEmail || typeof bodyEmail !== "string" || !bodyEmail.trim()) {
      res.status(400).json({ error: "EmailRequired", message: "Email address is required for Google Sign-In." });
      return;
    }
    const email = bodyEmail.trim().toLowerCase();
    const name = bodyName || email.split("@")[0] || "Google User";

    const premiumPlan = await prisma.membershipPlan.findFirst({
      where: { name: "Premium" },
    });

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

    const token = signToken({ dbUserId: user.id, createdAt: Date.now() });

    res.json({
      token,
      user: { id: user.id, username: user.name, phone: "", authMethod: "google" },
    });
  } catch (err: any) {
    console.error("[Google Auth Error]", err);
    res.status(500).json({ error: "GoogleAuthFailed", message: err.message || "Google sign-in failed." });
  }
});
export default router;
