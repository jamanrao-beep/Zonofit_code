"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mail_1 = require("../lib/mail");
const rateLimit_1 = require("../lib/rateLimit");
const router = (0, express_1.Router)();
/** Names the Udaipur launch page offers. Keep this list in sync with the website form. */
const GYM_NAMES = [
    "Pro Fitness Studio",
    "Mrinaal Fitness Empire",
    "Prime Fitness Studio",
    "Veer Fitness Gym",
    "Fireup Wolverinez Gym & Fitness",
    "B1 Fitness Gym and Supplement Store",
    "Zoro Fitness",
    "B&H Gym",
    "The Gym Zone",
    "The Fitness Zone Unisex Gym",
    "108 Being Fit Fitness",
    "Being Fit Fitness 2.0",
    "Dolphin Health Club",
];
const SEX = ["Male", "Female", "Other"];
function oneLine(value, max) {
    return String(value ?? "")
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max);
}
function indianMobile(value) {
    const digits = String(value ?? "").replace(/\D/g, "");
    const local = digits.length === 12 && digits.startsWith("91")
        ? digits.slice(2)
        : digits.length === 11 && digits.startsWith("0")
            ? digits.slice(1)
            : digits;
    return /^[6-9]\d{9}$/.test(local) ? local : null;
}
function parseApplication(body) {
    const input = body && typeof body === "object" ? body : {};
    const name = oneLine(input.name, 80);
    if (name.length < 2)
        return { ok: false, message: "Enter your name" };
    const phone = indianMobile(input.phone);
    if (!phone)
        return { ok: false, message: "Enter a valid 10-digit mobile number" };
    const ageNumber = typeof input.age === "number" ? input.age : Number(oneLine(input.age, 3));
    if (!Number.isInteger(ageNumber) || ageNumber < 16 || ageNumber > 70) {
        return { ok: false, message: "Age must be from 16 to 70" };
    }
    const sex = SEX.find((item) => item === oneLine(input.sex, 12));
    if (!sex)
        return { ok: false, message: "Pick one" };
    const gymText = oneLine(input.gym, 120);
    const customGym = oneLine(input.customGym, 120);
    const listed = GYM_NAMES.find((item) => item.toLowerCase() === gymText.toLowerCase());
    if (!listed && customGym.length < 3) {
        return { ok: false, message: "Pick a gym or tell us yours" };
    }
    const instagram = oneLine(input.instagram, 40).replace(/^@+/, "");
    if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) {
        return { ok: false, message: "Instagram handle looks off" };
    }
    return {
        ok: true,
        application: {
            name,
            phone,
            age: ageNumber,
            sex,
            gym: listed ?? "",
            customGym: listed ? "" : customGym,
            instagram,
        },
    };
}
function clientKey(req) {
    const header = req.headers["x-forwarded-for"];
    const first = Array.isArray(header) ? header[0] : header?.split(",")[0];
    const raw = (first || req.ip || "unknown").trim();
    return raw.replace(/[^\w.:-]/g, "").slice(0, 64) || "unknown";
}
function applicationMessage(application) {
    const gymLine = application.gym || "(not listed)";
    const requested = application.customGym || "—";
    const instagram = application.instagram ? `@${application.instagram}` : "—";
    const sheetUrl = (process.env.LAUNCH_OFFER_SHEET_URL || process.env.GOOGLE_SHEET_URL || "").trim();
    const lines = [
        "Udaipur launch offer",
        "zonofit.com/udaipur/launch-offer",
        "",
        `Name: ${application.name}`,
        `Mobile: +91${application.phone}`,
        `Age: ${application.age}`,
        `Sex: ${application.sex}`,
        `Gym: ${gymLine}`,
        `Requested gym: ${requested}`,
        `Instagram: ${instagram}`,
        "Source: launch-udaipur",
        `Submitted: ${new Date().toISOString()}`,
    ];
    if (sheetUrl) {
        lines.push("", `Google Sheet: ${sheetUrl}`);
    }
    return lines.join("\n");
}
/**
 * Appends the new submission to a connected Google Sheet via Google Apps Script Web App.
 * Non-blocking and never throws to the client.
 */
async function appendToGoogleSheet(application) {
    const webhookUrl = (process.env.LAUNCH_OFFER_SHEET_WEBHOOK_URL ||
        process.env.GOOGLE_SHEET_WEBHOOK_URL ||
        "").trim();
    if (!webhookUrl)
        return;
    try {
        const payload = {
            timestamp: new Date().toISOString(),
            name: application.name,
            phone: `+91${application.phone}`,
            age: application.age,
            sex: application.sex,
            gym: application.gym || "(not listed)",
            customGym: application.customGym || "—",
            instagram: application.instagram ? `@${application.instagram}` : "—",
            source: "launch-udaipur",
        };
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            redirect: "follow",
        });
        if (!res.ok) {
            console.warn(`[Launch] Google Sheet webhook returned HTTP ${res.status}`);
        }
        else {
            console.log(`[Launch] Form response synced to Google Sheet for ${application.name}`);
        }
    }
    catch (err) {
        console.error("[Launch] Failed to sync to Google Sheet:", err instanceof Error ? err.message : "error");
    }
}
/** Public application for the Udaipur launch page. Email + Google Sheet. No database row. */
router.post("/", async (req, res) => {
    try {
        if (oneLine(req.body?.website, 200)) {
            res.json({ ok: true });
            return;
        }
        const parsed = parseApplication(req.body);
        if (!parsed.ok) {
            res.status(400).json({ error: "ValidationError", message: parsed.message });
            return;
        }
        const { application } = parsed;
        const phoneAllowed = await (0, rateLimit_1.rateLimit)(`launch:${application.phone}`, 5, 60 * 60 * 1000);
        const ipAllowed = await (0, rateLimit_1.rateLimit)(`launch-ip:${clientKey(req)}`, 80, 60 * 60 * 1000);
        if (!phoneAllowed || !ipAllowed) {
            res.status(429).json({
                error: "TooManyRequests",
                message: "Too many tries. Wait a bit and try again.",
            });
            return;
        }
        const sent = await (0, mail_1.sendInboxNotice)(`Udaipur launch offer - ${application.name}`, applicationMessage(application));
        if (!sent) {
            res.status(503).json({
                error: "EmailNotConfigured",
                message: "We could not send this right now. Try again in a minute.",
            });
            return;
        }
        // Append to Google Sheet in the background (non-blocking)
        void appendToGoogleSheet(application);
        res.json({ ok: true });
    }
    catch (err) {
        console.error("[Launch] Could not record the application.", err instanceof Error ? err.message : "error");
        res.status(500).json({ error: "ServerError", message: "Could not send. Try again." });
    }
});
exports.default = router;
//# sourceMappingURL=launchOffer.js.map