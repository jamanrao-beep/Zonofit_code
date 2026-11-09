"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const launchGameResult_1 = require("../lib/launchGameResult");
const launchSheet_1 = require("../lib/launchSheet");
const mail_1 = require("../lib/mail");
const launchOffer_1 = require("./launchOffer");
const router = (0, express_1.Router)();
const OUTCOMES = ["win", "draw", "loss", "abandoned"];
const inflight = new Set();
const resultFlight = new Set();
const savedResults = new Set();
function oneLine(value, max) {
    return String(value ?? "")
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max);
}
function honeypot(req) {
    return oneLine(req.body?.website, 200).length > 0;
}
/** Public registration for the lucky challenge. Sheet only. No database row. */
router.post("/", async (req, res) => {
    try {
        if (honeypot(req)) {
            res.json({ ok: true, pid: "local" });
            return;
        }
        const parsed = (0, launchOffer_1.parseApplication)(req.body);
        if (!parsed.ok) {
            res.status(400).json({ error: "ValidationError", message: parsed.message });
            return;
        }
        const { application } = parsed;
        if (inflight.has(application.phone)) {
            res.status(409).json({ error: "AlreadyRegistered", message: "This mobile number is already registered." });
            return;
        }
        inflight.add(application.phone);
        try {
            const used = await (0, launchSheet_1.sheetHasMobile)(application.phone);
            if (used) {
                res.status(409).json({ error: "AlreadyRegistered", message: "This mobile number is already registered." });
                return;
            }
            const pid = `ZF-${Date.now().toString(36).toUpperCase()}`;
            const saved = await (0, launchSheet_1.appendLaunchRow)(application, { source: `launch-game ${pid}` });
            if (!saved) {
                res.status(503).json({
                    error: "SheetUnavailable",
                    message: "We could not save this right now. Try again in a minute.",
                });
                return;
            }
            (0, launchSheet_1.rememberPhone)(application.phone);
            void (0, mail_1.sendInboxNotice)(`Lucky Challenge - ${application.name}`, [
                "ZonoFit Lucky Challenge",
                "zonofit.com/launch-game",
                "",
                `Name: ${application.name}`,
                `Mobile: +91${application.phone}`,
                `Age: ${application.age}`,
                `Sex: ${application.sex}`,
                `Gym: ${application.gym || "(not listed)"}`,
                `Requested gym: ${application.customGym || "—"}`,
                `Instagram: ${application.instagram ? `@${application.instagram}` : "—"}`,
                `Id: ${pid}`,
                "Source: launch-game",
            ].join("\n"));
            res.json({ ok: true, pid });
        }
        finally {
            inflight.delete(application.phone);
        }
    }
    catch (err) {
        console.error("[LaunchGame] Could not save the registration.", err instanceof Error ? err.message : "error");
        res.status(503).json({
            error: "SheetUnavailable",
            message: "We could not check this number right now. Try again in a minute.",
        });
    }
});
router.post("/result", async (req, res) => {
    try {
        if (honeypot(req)) {
            res.json({ ok: true });
            return;
        }
        const parsed = (0, launchOffer_1.parseApplication)(req.body);
        if (!parsed.ok) {
            res.status(400).json({ error: "ValidationError", message: parsed.message });
            return;
        }
        const level = typeof req.body?.level === "number" ? req.body.level : Number(oneLine(req.body?.level, 2));
        if (!(0, launchGameResult_1.knownLevel)(level)) {
            res.status(400).json({ error: "ValidationError", message: "Pick a level from 1 to 6" });
            return;
        }
        const outcomeText = oneLine(req.body?.outcome, 12);
        const outcome = OUTCOMES.find((item) => item === outcomeText);
        if (!outcome) {
            res.status(400).json({ error: "ValidationError", message: "Result is missing" });
            return;
        }
        const you = score(req.body?.you);
        const zonofit = score(req.body?.zonofit);
        if (outcome !== "abandoned" && (you === null || zonofit === null)) {
            res.status(400).json({ error: "ValidationError", message: "Score is missing" });
            return;
        }
        const { application } = parsed;
        const known = await (0, launchSheet_1.sheetHasMobile)(application.phone);
        if (!known) {
            res.status(400).json({ error: "NotRegistered", message: "Register before saving a result." });
            return;
        }
        if (savedResults.has(application.phone)) {
            res.status(409).json({ error: "AlreadySaved", message: "This result is already saved." });
            return;
        }
        if (resultFlight.has(application.phone)) {
            res.status(429).json({ error: "ResultInProgress", message: "This result is already being saved. Try again in a moment." });
            return;
        }
        resultFlight.add(application.phone);
        try {
            if (await (0, launchSheet_1.sheetHasSavedResult)(application.phone)) {
                savedResults.add(application.phone);
                res.status(409).json({ error: "AlreadySaved", message: "This result is already saved." });
                return;
            }
            const settled = (0, launchGameResult_1.settleChallenge)(level, outcome, you, zonofit);
            const summary = (0, launchGameResult_1.challengeResultLine)(level, settled.outcome, settled.you, settled.zonofit, settled.reward);
            const row = { ...application, customGym: summary };
            const saved = await (0, launchSheet_1.appendLaunchRow)(row, {
                source: `launch-game-result ${summary}`.slice(0, 140),
                extra: {
                    level,
                    outcome: settled.outcome,
                    you: settled.you ?? "",
                    zonofit: settled.zonofit ?? "",
                    reward: settled.reward,
                },
            });
            if (!saved) {
                res.status(503).json({
                    error: "SheetUnavailable",
                    message: "We could not save the result. Try again in a minute.",
                });
                return;
            }
            savedResults.add(application.phone);
            void (0, mail_1.sendInboxNotice)(`Lucky Challenge result - ${application.name} - Level ${level} ${settled.outcome}`, [
                "ZonoFit Lucky Challenge result",
                "zonofit.com/launch-game",
                "",
                `Name: ${application.name}`,
                `Mobile: +91${application.phone}`,
                `Gym: ${application.gym || application.customGym || "—"}`,
                summary,
            ].join("\n"));
            res.json({ ok: true, ...settled });
        }
        finally {
            resultFlight.delete(application.phone);
        }
    }
    catch (err) {
        console.error("[LaunchGame] Could not save the result.", err instanceof Error ? err.message : "error");
        res.status(503).json({
            error: "SheetUnavailable",
            message: "We could not save the result. Try again in a minute.",
        });
    }
});
function score(value) {
    if (value === null || value === undefined || value === "")
        return null;
    const number = typeof value === "number" ? value : Number(oneLine(value, 3));
    if (!Number.isInteger(number) || number < 0 || number > 25)
        return null;
    return number;
}
exports.default = router;
//# sourceMappingURL=launchGame.js.map