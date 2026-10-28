"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
// ─── GET /api/content/settings ──────────────────────────────────────────────
router.get("/settings", async (req, res) => {
    try {
        const settings = await prisma_1.default.systemSettings.findUnique({
            where: { id: "default" }
        });
        res.json({
            success: true,
            settings: {
                creditPurchasePrice: settings?.creditPurchasePrice ?? 10,
                creditConversionValue: settings?.creditConversionValue ?? 8,
                cashExpiryDays: settings?.cashExpiryDays ?? 15,
                initialVisitCut: settings?.initialVisitCut ?? 10,
            }
        });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/content/:key ────────────────────────────────────────────────
/**
 * Fetches public system content by key (e.g. faq_general, terms_and_conditions)
 */
router.get("/:key", async (req, res) => {
    try {
        const key = req.params.key;
        const content = await prisma_1.default.systemContent.findUnique({
            where: { key }
        });
        if (!content) {
            res.status(404).json({ error: "NotFound", message: "Content not found for key: " + key });
            return;
        }
        res.json({
            success: true,
            content: {
                key: content.key,
                value: content.value
            }
        });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=content.js.map