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

import prisma from "./lib/prisma";
import bcrypt from "bcryptjs";

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
app.use(express.json({ limit: "1mb" }));
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
    let dbError = null;
    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = "connected";
    } catch (err: any) {
        dbStatus = "disconnected";
        dbError = err.message;
    }

    res.json({
        status: dbStatus === "connected" ? "ok" : "degraded",
        service: "zonofit-server",
        db: dbStatus,
        ...(dbError && { dbError }),
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
    });
});

async function ensureAdminUser(): Promise<void> {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;

    try {
        const existing = await prisma.user.findFirst({ where: { email } });
        if (!existing) {
            const passwordHash = await bcrypt.hash(password, 10);
            await prisma.user.create({
                data: {
                    email,
                    name: "ZonoFit Admin",
                    passwordHash,
                    systemRole: "ADMIN",
                },
            });
            console.log(`[Admin] Initial admin user ready: ${email}`);
        }
    } catch (err: any) {
        console.warn("[Admin] Could not verify/seed admin user:", err.message);
    }
}

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

// ─── Start ─────────────────────────────────────────────────────────────────────
initCronJobs();

app.listen(PORT, "0.0.0.0", () => {
    console.log(`
╔══════════════════════════════════════╗
║  ZonoFit Server                      ║
║  Running on http://localhost:${PORT}    ║
║  Environment: ${(process.env.NODE_ENV ?? "development").padEnd(20)}║
╚══════════════════════════════════════╝
  `);
    ensureAdminUser();
});

export default app;
