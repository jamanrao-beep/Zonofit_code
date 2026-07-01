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

const app = express();
const PORT = parseInt(process.env.PORT ?? "3000", 10);

// ─── Security & Logging ────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// ─── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, server-to-server)
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: Origin ${origin} not allowed`));
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
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "zonofit-server",
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
    });
});

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

app.use("/api/feedback", feedbackRoutes);

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
});

export default app;
