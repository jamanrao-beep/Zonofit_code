"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
// ─── GET /api/quotes/daily ───────────────────────────────────────────────────
/**
 * Returns a dynamic daily quote. For MVP, we'll pick a random one.
 */
router.get("/daily", async (req, res) => {
    try {
        const quotes = await prisma_1.default.quote.findMany();
        if (quotes.length === 0) {
            res.json({ text: "Consistency beats intensity. Just show up today." });
            return;
        }
        const randomIndex = Math.floor(Math.random() * quotes.length);
        res.json(quotes[randomIndex]);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch quote" });
    }
});
exports.default = router;
//# sourceMappingURL=quotes.js.map