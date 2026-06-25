import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

// Routes
import webhookRoutes from "./routes/webhooks";
import userRoutes from "./routes/users";
import membershipRoutes from "./routes/membership";
import creditRoutes from "./routes/credits";
import gymRoutes from "./routes/gyms";
import bookingRoutes from "./routes/bookings";
import checkinRoutes from "./routes/checkin";

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
// Webhooks need raw body for signature verification
app.use("/api/webhooks", express.raw({ type: "application/json" }));
// Everything else gets parsed JSON
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

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
// Webhooks — NO auth middleware (Clerk verifies via signature)
app.use("/api/webhooks", webhookRoutes);

// Authenticated routes
app.use("/api/users", userRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/credits", creditRoutes);
app.use("/api/gyms", gymRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/checkin", checkinRoutes);

// ─── 404 & Error Handling ──────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║  ZonoFit Server                      ║
║  Running on http://localhost:${PORT}    ║
║  Environment: ${(process.env.NODE_ENV ?? "development").padEnd(20)}║
╚══════════════════════════════════════╝
  `);
});

export default app;
