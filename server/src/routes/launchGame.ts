import { randomInt } from "crypto";
import { Request, Response, Router } from "express";
import {
  deleteOpenLaunchGameEntry,
  insertLaunchGameEntry,
  launchGameEntryState,
  launchGamePhoneTaken,
  saveLaunchGameResult,
} from "../lib/launchGameEntries";
import { boxesOnLevel, challengeResultLine, knownLevel, settleChallenge } from "../lib/launchGameResult";
import {
  appendLaunchRow,
  rememberPhone,
  sheetHasMobile,
  sheetHasSavedResult,
} from "../lib/launchSheet";
import { sendInboxNotice } from "../lib/mail";
import { deleteOTP, setOTP, verifyOTP } from "../lib/otpStore";
import { rateLimit } from "../lib/rateLimit";
import { sendOTP } from "../lib/sms";
import { parseApplication, type Application } from "./launchOffer";

const router = Router();

const OUTCOMES = ["win", "draw", "loss", "abandoned"] as const;

const inflight = new Set<string>();
const resultFlight = new Set<string>();
const savedResults = new Set<string>();

function oneLine(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function honeypot(req: Request): boolean {
  return oneLine(req.body?.website, 200).length > 0;
}

function gamePhone(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

function clientKey(req: Request): string {
  const header = req.headers["x-forwarded-for"];
  const first = Array.isArray(header) ? header[0] : header?.split(",")[0];
  const raw = (first || req.ip || "unknown").trim();
  return raw.replace(/[^\w.:-]/g, "").slice(0, 64) || "unknown";
}

function safeError(err: unknown): string {
  return String(err instanceof Error ? err.message : "error").replace(/\d{8,}/g, "[redacted]").slice(0, 240);
}

function otpKey(phone: string): string {
  return `game:${phone}`;
}

const ALREADY = { error: "AlreadyRegistered", message: "This mobile number is already registered." };

/** Sends a 4-digit code for the challenge form. The code is never returned. */
router.post("/otp", async (req: Request, res: Response): Promise<void> => {
  try {
    if (honeypot(req)) {
      res.json({ ok: true });
      return;
    }
    const phone = gamePhone(req.body?.phone);
    if (!phone) {
      res.status(400).json({ error: "InvalidPhone", message: "Enter a valid 10-digit mobile number." });
      return;
    }
    if (!(await rateLimit(`game-otp:${phone}`, 5, 15 * 60 * 1000))) {
      res.status(429).json({ error: "TooManyRequests", message: "Too many code requests. Wait a few minutes and try again." });
      return;
    }
    if (!(await rateLimit(`game-otp-ip:${clientKey(req)}`, 20, 60 * 60 * 1000))) {
      res.status(429).json({ error: "TooManyRequests", message: "Too many code requests. Wait a few minutes and try again." });
      return;
    }
    if ((await launchGamePhoneTaken(phone)) || (await sheetHasMobile(phone))) {
      res.status(409).json(ALREADY);
      return;
    }
    const code = randomInt(1000, 10000).toString();
    await setOTP(otpKey(phone), code);
    const sent = await sendOTP(phone, code);
    if (!sent.success) {
      await deleteOTP(otpKey(phone));
      res.status(503).json({ error: "SMSFailed", message: "We could not send the code. Try again in a minute." });
      return;
    }
    res.json({ ok: true });
  } catch (err: unknown) {
    console.error("[LaunchGame] Could not send the code.", safeError(err));
    res.status(503).json({ error: "SMSFailed", message: "We could not send the code. Try again in a minute." });
  }
});

/** Public registration. The phone is stored once in MySQL, then the sheet row is appended. */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    if (honeypot(req)) {
      res.json({ ok: true, pid: "local" });
      return;
    }
    const parsed = parseApplication(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: "ValidationError", message: parsed.message });
      return;
    }
    const otp = String(req.body?.otp ?? "").replace(/\D/g, "").slice(0, 8);
    if (!/^\d{4}$/.test(otp)) {
      res.status(400).json({ error: "InvalidCode", message: "Enter the 4-digit code we sent." });
      return;
    }
    const { application } = parsed;
    if (inflight.has(application.phone)) {
      res.status(409).json(ALREADY);
      return;
    }
    inflight.add(application.phone);
    try {
      if ((await launchGamePhoneTaken(application.phone)) || (await sheetHasMobile(application.phone))) {
        res.status(409).json(ALREADY);
        return;
      }
      const verified = await verifyOTP(otpKey(application.phone), otp);
      if (!verified) {
        res.status(400).json({ error: "InvalidCode", message: "That code is wrong or expired. Request a new one." });
        return;
      }
      const pid = `ZF-${Date.now().toString(36).toUpperCase()}`;
      const inserted = await insertLaunchGameEntry(application, pid);
      if (inserted === "duplicate") {
        res.status(409).json(ALREADY);
        return;
      }
      const saved = await appendLaunchRow(application, { source: `launch-game ${pid}` });
      if (!saved) {
        try {
          await deleteOpenLaunchGameEntry(application.phone);
        } catch (releaseErr: unknown) {
          console.error("[LaunchGame] Could not release the registration.", safeError(releaseErr));
        }
        res.status(503).json({
          error: "SheetUnavailable",
          message: "We could not save this right now. Request a new code and try again.",
        });
        return;
      }
      rememberPhone(application.phone);
      void sendInboxNotice(
        `Lucky Challenge - ${application.name}`,
        [
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
        ].join("\n"),
      );
      res.json({ ok: true, pid });
    } finally {
      inflight.delete(application.phone);
    }
  } catch (err: unknown) {
    console.error("[LaunchGame] Could not save the registration.", safeError(err));
    res.status(503).json({
      error: "SheetUnavailable",
      message: "We could not check this number right now. Try again in a minute.",
    });
  }
});

router.post("/result", async (req: Request, res: Response): Promise<void> => {
  try {
    if (honeypot(req)) {
      res.json({ ok: true });
      return;
    }
    const parsed = parseApplication(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: "ValidationError", message: parsed.message });
      return;
    }
    const level = typeof req.body?.level === "number" ? req.body.level : Number(oneLine(req.body?.level, 2));
    if (!knownLevel(level)) {
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
    const boxes = boxesOnLevel(level);
    if (outcome !== "abandoned" && (you === null || zonofit === null || boxes === null || you + zonofit !== boxes)) {
      res.status(400).json({ error: "ValidationError", message: "Score does not match this level." });
      return;
    }

    const { application } = parsed;
    const state = await launchGameEntryState(application.phone);
    if (state === "missing" && !(await sheetHasMobile(application.phone))) {
      res.status(400).json({ error: "NotRegistered", message: "Register before saving a result." });
      return;
    }
    if (state === "finished" || savedResults.has(application.phone)) {
      res.status(409).json({ error: "AlreadySaved", message: "This result is already saved." });
      return;
    }
    if (resultFlight.has(application.phone)) {
      res.status(429).json({ error: "ResultInProgress", message: "This result is already being saved. Try again in a moment." });
      return;
    }
    resultFlight.add(application.phone);
    try {
      if (await sheetHasSavedResult(application.phone)) {
        savedResults.add(application.phone);
        res.status(409).json({ error: "AlreadySaved", message: "This result is already saved." });
        return;
      }

      const settled = settleChallenge(level, outcome, you, zonofit);
      const summary = challengeResultLine(level, settled.outcome, settled.you, settled.zonofit, settled.reward);
      const row: Application = { ...application, customGym: summary };
      const saved = await appendLaunchRow(row, {
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
      try {
        await saveLaunchGameResult(application.phone, {
          level,
          outcome: settled.outcome,
          you: settled.you,
          zonofit: settled.zonofit,
        });
      } catch (storeErr: unknown) {
        console.error("[LaunchGame] Could not store the result.", safeError(storeErr));
      }
      void sendInboxNotice(
        `Lucky Challenge result - ${application.name} - Level ${level} ${settled.outcome}`,
        [
          "ZonoFit Lucky Challenge result",
          "zonofit.com/launch-game",
          "",
          `Name: ${application.name}`,
          `Mobile: +91${application.phone}`,
          `Gym: ${application.gym || application.customGym || "—"}`,
          summary,
        ].join("\n"),
      );
      res.json({ ok: true, ...settled });
    } finally {
      resultFlight.delete(application.phone);
    }
  } catch (err: unknown) {
    console.error("[LaunchGame] Could not save the result.", safeError(err));
    res.status(503).json({
      error: "SheetUnavailable",
      message: "We could not save the result. Try again in a minute.",
    });
  }
});

function score(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(oneLine(value, 4));
  if (!Number.isInteger(number) || number < 0 || number > 625) return null;
  return number;
}

export default router;
