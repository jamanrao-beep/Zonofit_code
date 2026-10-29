"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const errorHandler_1 = require("./middleware/errorHandler");
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const auth_portal_1 = __importDefault(require("./routes/auth-portal"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const chat_1 = __importDefault(require("./routes/chat")); // Chat route
const checkin_1 = __importDefault(require("./routes/checkin"));
const credits_1 = __importDefault(require("./routes/credits"));
const gyms_1 = __importDefault(require("./routes/gyms"));
const journey_1 = __importDefault(require("./routes/journey"));
const marketplace_1 = __importDefault(require("./routes/marketplace"));
const membership_1 = __importDefault(require("./routes/membership"));
const quotes_1 = __importDefault(require("./routes/quotes"));
const roles_1 = __importDefault(require("./routes/roles"));
const users_1 = __importDefault(require("./routes/users"));
const feedback_1 = __importDefault(require("./routes/feedback"));
const challenges_1 = __importDefault(require("./routes/challenges"));
const admin_1 = __importDefault(require("./routes/admin"));
const trial_gyms_1 = __importDefault(require("./routes/trial-gyms"));
const coupons_1 = __importDefault(require("./routes/coupons"));
const content_1 = __importDefault(require("./routes/content"));
const prisma_1 = __importDefault(require("./lib/prisma"));
// Process level safety guards
process.on("unhandledRejection", (reason) => {
    console.error("[UnhandledRejection]", reason);
});
process.on("uncaughtException", (error) => {
    console.error("[UncaughtException]", error);
});
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT ?? "3000", 10);
// ─── Security & Logging ────────────────────────────────────────────────────────
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)(process.env.NODE_ENV === "development" ? "dev" : "combined"));
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, server-to-server) or matching origins
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".zonofit.com")) {
            callback(null, true);
        }
        else {
            callback(null, false);
        }
    },
    credentials: true,
}));
// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express_1.default.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
        const url = req.originalUrl || req.url || "";
        if (url.startsWith("/api/credits/webhook")) {
            req.rawBody = Buffer.from(buf);
        }
    },
}));
app.use(express_1.default.urlencoded({ extended: true }));
// ─── Static File Serving (Uploads) ─────────────────────────────────────────────
const uploadsDir = path_1.default.join(__dirname, "../uploads");
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express_1.default.static(uploadsDir));
// ─── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
    let dbStatus = "unknown";
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        dbStatus = "connected";
    }
    catch (err) {
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
// ─── API Routes ────────────────────────────────────────────────────────────────
// Auth routes (public)
app.use("/api/auth/portal", auth_portal_1.default);
app.use("/api/auth", auth_1.default);
// Authenticated routes
app.use("/api/users", users_1.default);
app.use("/api/membership", membership_1.default);
app.use("/api/credits", credits_1.default);
app.use("/api/gyms", gyms_1.default);
app.use("/api/bookings", bookings_1.default);
app.use("/api/checkin", checkin_1.default);
app.use("/api/marketplace", marketplace_1.default);
app.use("/api/chat", chat_1.default);
app.use("/api/quotes", quotes_1.default);
app.use("/api/journey", journey_1.default);
app.use("/api/roles", roles_1.default);
app.use("/api/challenges", challenges_1.default);
app.use("/api/trial-gyms", trial_gyms_1.default);
app.use("/api/coupons", coupons_1.default);
app.use("/api/content", content_1.default);
app.use("/api/feedback", feedback_1.default);
app.use("/api/admin", admin_1.default);
// ─── 404 & Error Handling ──────────────────────────────────────────────────────
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
const cron_1 = require("./services/cron");
const ensureSchema_1 = require("./lib/ensureSchema");
const mail_1 = require("./lib/mail");
function assertBootSecrets() {
    const secret = process.env.JWT_SECRET?.trim() ?? "";
    if (secret.length < 32 || secret === "zonofit_super_secret_key_1234567890") {
        console.error("Refusing to start: set a unique JWT_SECRET of at least 32 characters.");
        process.exit(1);
    }
}
function warnMissingProviderKeys() {
    const names = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "FAST2SMS_API_KEY"];
    const missing = names.filter((name) => {
        const value = process.env[name]?.trim() ?? "";
        return value.length < 8 || /placeholder/i.test(value);
    });
    if (!(0, mail_1.normalizeAppPassword)(process.env.GMAIL_APP_PASSWORD))
        missing.push("GMAIL_APP_PASSWORD");
    if (missing.length > 0) {
        console.warn(`[Startup] Payments or SMS stay unavailable until these are set: ${missing.join(", ")}`);
    }
}
// ─── Start ─────────────────────────────────────────────────────────────────────
async function start() {
    assertBootSecrets();
    warnMissingProviderKeys();
    try {
        await (0, ensureSchema_1.ensureSchema)();
    }
    catch (err) {
        console.error("[Startup] schema check failed", err);
    }
    (0, cron_1.initCronJobs)();
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
exports.default = app;
//# sourceMappingURL=index.js.map