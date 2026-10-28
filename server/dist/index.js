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
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT ?? "3000", 10);
// ─── Security & Logging ────────────────────────────────────────────────────────
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)(process.env.NODE_ENV === "development" ? "dev" : "combined"));
// ─── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS: Origin ${origin} not allowed`));
        }
    },
    credentials: true,
}));
// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express_1.default.json({ limit: "1mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// ─── Static File Serving (Uploads) ─────────────────────────────────────────────
const uploadsDir = path_1.default.join(__dirname, "../uploads");
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express_1.default.static(uploadsDir));
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
// ─── Start ─────────────────────────────────────────────────────────────────────
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
exports.default = app;
//# sourceMappingURL=index.js.map