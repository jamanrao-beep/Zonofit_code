import { Request, Response, Router } from "express";
import { appendLaunchRow, launchSheetPageUrl } from "../lib/launchSheet";
import { sendInboxNotice } from "../lib/mail";
import { rateLimit } from "../lib/rateLimit";

const router = Router();

/** Names the Udaipur launch page offers. Keep this list in sync with the website form. */
const GYM_NAMES = [
  // Registered / Live on ZonoFit
  "Pro Fitness Studio",
  "Pro Fitness Studio (Madri Industrial Area)",
  "Mrinaal Fitness Empire",
  "Mrinaal Fitness Empire (Branch 1 – Sector 11, Hiran Magri)",
  "Mrinaal Fitness Empire (Branch 2)",
  "Prime Fitness Studio",
  "Prime Fitness Studio (Sector 3, Hiran Magri)",
  "Veer Fitness Gym",
  "Veer Fitness Gym (Sector 3, Hiran Magri)",
  "Fireup Wolverinez Gym & Fitness",
  "Fireup Wolverinez Gym & Fitness (Sector 5, Hiran Magri)",
  "B1 Fitness Gym and Supplement Store",
  "B1 Fitness Gym and Supplement Store (Sajjangarh Road)",
  "Zoro Fitness",
  "Zoro Fitness (100 Feet Road)",
  "B&H Gym",
  "B&H Gym (Main Road)",
  "The Gym Zone",
  "The Gym Zone (Ashirwad Nagar)",
  "The Gym Zone (University Road)",
  "The Fitness Zone Unisex Gym",
  "The Fitness Zone Unisex Gym (Ashok Nagar)",
  "108 Being Fit Fitness",
  "108 Being Fit Fitness (Sector 4, Hiran Magri)",
  "Being Fit Fitness 2.0",
  "Being Fit Fitness 2.0 (Pulla Bhuwana)",
  "Dolphin Health Club",
  "Dolphin Health Club (Thoker Chouraha, Ganapati Nagar)",
  // Unlock / About to join
  "Healthline Fitness Studio",
  "ALPHA FITNESS CLUB",
  "The Fitness Freak Health Club",
  "Core fitness gym udaipur",
  "Scitify Gym & Performance",
  "Shape Up Fitness",
  "Delta fitness",
  "Metroflex gym",
  "Ekaay fitness",
  "Energy Fitness",
  "Paliwal Gym",
  "Strong Fit Gym",
  "Daesthetic club",
] as const;

const SEX = ["Male", "Female", "Other"] as const;

export type Application = {
  name: string;
  phone: string;
  age: number;
  sex: (typeof SEX)[number];
  gym: string;
  customGym: string;
  instagram: string;
};

function oneLine(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function indianMobile(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  const local =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

export function parseApplication(body: unknown): { ok: true; application: Application } | { ok: false; message: string } {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = oneLine(input.name, 80);
  if (name.length < 2) return { ok: false, message: "Enter your name" };

  const phone = indianMobile(input.phone);
  if (!phone) return { ok: false, message: "Enter a valid 10-digit mobile number" };

  const ageNumber = typeof input.age === "number" ? input.age : Number(oneLine(input.age, 3));
  if (!Number.isInteger(ageNumber) || ageNumber < 16 || ageNumber > 70) {
    return { ok: false, message: "Age must be from 16 to 70" };
  }

  const sex = SEX.find((item) => item === oneLine(input.sex, 12));
  if (!sex) return { ok: false, message: "Pick one" };

  const gymText = oneLine(input.gym, 120);
  const customGym = oneLine(input.customGym, 120);
  const normalized = gymText.toLowerCase();
  const listed = GYM_NAMES.filter(
    (item) =>
      normalized === item.toLowerCase() ||
      normalized.startsWith(item.toLowerCase())
  ).sort((a, b) => b.length - a.length)[0];
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

function clientKey(req: Request): string {
  const header = req.headers["x-forwarded-for"];
  const first = Array.isArray(header) ? header[0] : header?.split(",")[0];
  const raw = (first || req.ip || "unknown").trim();
  return raw.replace(/[^\w.:-]/g, "").slice(0, 64) || "unknown";
}

function applicationMessage(application: Application): string {
  const gymLine = application.gym || "(not listed)";
  const requested = application.customGym || "—";
  const instagram = application.instagram ? `@${application.instagram}` : "—";
  const sheetUrl = launchSheetPageUrl();

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

/** Appends the new submission to the existing Google Sheet. No database row. */
async function appendToGoogleSheet(application: Application): Promise<void> {
  const saved = await appendLaunchRow(application, { source: "launch-udaipur" });
  if (saved) console.log("[Launch] Form response synced to Google Sheet");
}

/** Public application for the Udaipur launch page. Email + Google Sheet. No database row. */
router.post("/", async (req: Request, res: Response): Promise<void> => {
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
    const phoneAllowed = await rateLimit(`launch:${application.phone}`, 5, 60 * 60 * 1000);
    const ipAllowed = await rateLimit(`launch-ip:${clientKey(req)}`, 80, 60 * 60 * 1000);
    if (!phoneAllowed || !ipAllowed) {
      res.status(429).json({
        error: "TooManyRequests",
        message: "Too many tries. Wait a bit and try again.",
      });
      return;
    }

    const sent = await sendInboxNotice(
      `Udaipur launch offer - ${application.name}`,
      applicationMessage(application)
    );
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
  } catch (err: unknown) {
    console.error("[Launch] Could not record the application.", err instanceof Error ? err.message : "error");
    res.status(500).json({ error: "ServerError", message: "Could not send. Try again." });
  }
});

export default router;
