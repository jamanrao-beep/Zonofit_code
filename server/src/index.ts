import cors from "cors";
import "dotenv/config";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import fs from "fs";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./routes/auth";
import authPortalRoutes from "./routes/auth-portal";
import bookingsRouter from "./routes/bookings";
import chatRouter from "./routes/chat"; // Chat route
import checkinRouter from "./routes/checkin";
import creditRoutes from "./routes/credits";
import gymRoutes from "./routes/gyms";
import journeyRouter from "./routes/journey";
import marketplaceRouter from "./routes/marketplace";
import membershipRoutes from "./routes/membership";
import quotesRouter from "./routes/quotes";
import rolesRouter from "./routes/roles";
import userRoutes from "./routes/users";
import feedbackRoutes from "./routes/feedback";
import challengesRoutes from "./routes/challenges";
import adminRoutes from "./routes/admin";
import trialGymsRouter from "./routes/trial-gyms";
import couponsRouter from "./routes/coupons";
import contentRouter from "./routes/content";
import googleOAuthReturnRoutes from "./routes/googleOAuthReturn";

import prisma from "./lib/prisma";

// Process level safety guards
process.on("unhandledRejection", (reason) => {
    console.error("[UnhandledRejection]", reason);
});
process.on("uncaughtException", (error) => {
    console.error("[UncaughtException]", error);
});

const app = express();
const PORT = parseInt(process.env.PORT ?? "3000", 10);

// ─── Security & Logging ────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// ─── CORS ──────────────────────────────────────────────────────────────────────
const defaultOrigins = [
    "https://zonofit.com",
    "https://gym.zonofit.com",
    "https://admin.zonofit.com",
    "https://api.zonofit.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
];

const envOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, server-to-server) or matching origins
            if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".zonofit.com")) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        },
        credentials: true,
    })
);

// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => {
    const url = (req as { originalUrl?: string; url?: string }).originalUrl || req.url || "";
    if (url.startsWith("/api/credits/webhook")) {
      (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    }
  },
}));
app.use(express.urlencoded({ extended: true }));

// ─── Static File Serving (Uploads) ─────────────────────────────────────────────
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
    let dbStatus = "unknown";
    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = "connected";
    } catch (err) {
        dbStatus = "disconnected";
        console.error("[health] database check failed");
    }

    res.json({
        status: dbStatus === "connected" ? "ok" : "degraded",
        service: "zonofit-server",
        db: dbStatus,
        timestamp: new Date().toISOString(),
    });
});

// Google's web client only accepts an https redirect. This page hands the
// chosen account back to the app. The token stays in the browser hash.
app.use("/oauth", googleOAuthReturnRoutes);

// ─── API Routes ────────────────────────────────────────────────────────────────
// Auth routes (public)
app.use("/api/auth/portal", authPortalRoutes);
app.use("/api/auth", authRoutes);

// Authenticated routes
app.use("/api/users", userRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/credits", creditRoutes);
app.use("/api/gyms", gymRoutes);
app.use("/api/bookings", bookingsRouter);
app.use("/api/checkin", checkinRouter);
app.use("/api/marketplace", marketplaceRouter);
app.use("/api/chat", chatRouter);
app.use("/api/quotes", quotesRouter);
app.use("/api/journey", journeyRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/challenges", challengesRoutes);
app.use("/api/trial-gyms", trialGymsRouter);
app.use("/api/coupons", couponsRouter);
app.use("/api/content", contentRouter);

app.use("/api/feedback", feedbackRoutes);
app.use("/api/admin", adminRoutes);

// ─── 404 & Error Handling ──────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

import { initCronJobs } from "./services/cron";
import { ensureSchema } from "./lib/ensureSchema";
import { normalizeAppPassword } from "./lib/mail";

function assertBootSecrets(): void {
    const secret = process.env.JWT_SECRET?.trim() ?? "";
    if (secret.length < 32 || secret === "zonofit_super_secret_key_1234567890") {
        console.error("Refusing to start: set a unique JWT_SECRET of at least 32 characters.");
        process.exit(1);
    }
}

function warnMissingProviderKeys(): void {
    const names = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "FAST2SMS_API_KEY"];
    const missing = names.filter((name) => {
        const value = process.env[name]?.trim() ?? "";
        return value.length < 8 || /placeholder/i.test(value);
    });
    if (!normalizeAppPassword(process.env.GMAIL_APP_PASSWORD)) missing.push("GMAIL_APP_PASSWORD");
    if (missing.length > 0) {
        console.warn(`[Startup] Payments or SMS stay unavailable until these are set: ${missing.join(", ")}`);
    }
}

// ─── Start ─────────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
    assertBootSecrets();
    warnMissingProviderKeys();
    try {
        await ensureSchema();
    } catch (err) {
        console.error("[Startup] schema check failed", err);
    }
    initCronJobs();
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`
╔══════════════════════════════════════╗
║  ZonoFit Server                      ║
║  Running on http://localhost:${PORT}    ║
║  Environment: ${(process.env.NODE_ENV ?? "development").padEnd(20)}║
╚══════════════════════════════════════╝
  `);
    });
}

void start();

export default app;
