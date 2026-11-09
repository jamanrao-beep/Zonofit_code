/**
 * Launch applications go to the existing Google Sheet.
 * Nothing in this file writes a database row.
 */

export type SheetApplication = {
  name: string;
  phone: string;
  age: number;
  sex: string;
  gym: string;
  customGym: string;
  instagram: string;
};

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1HmMrKW35BYsgGBHdcF4XVxUtKn-ikQ4GRJHittKNh30/edit?usp=sharing";

const DEFAULT_SHEET_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbyALASJmd9MZ8HNqvvMTzleZkOEX6p4ZW588B2d5u8Nrujsx8uCpuZWzMcDTyJDawtl/exec";

const seenPhones = new Set<string>();

export function launchSheetPageUrl(): string {
  return (
    process.env.LAUNCH_OFFER_SHEET_URL ||
    process.env.GOOGLE_SHEET_URL ||
    DEFAULT_SHEET_URL
  ).trim();
}

function webhookUrl(): string {
  return (
    process.env.LAUNCH_OFFER_SHEET_WEBHOOK_URL ||
    process.env.GOOGLE_SHEET_WEBHOOK_URL ||
    DEFAULT_SHEET_WEBHOOK_URL
  ).trim();
}

function sheetCsvUrl(): string {
  const match = launchSheetPageUrl().match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const id = match?.[1] ?? "1HmMrKW35BYsgGBHdcF4XVxUtKn-ikQ4GRJHittKNh30";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
}

export function normalizeIndianMobile(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  const local =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.trim().length > 0));
}

export function phonesInSheetCsv(csv: string): string[] {
  const rows = parseCsv(csv);
  if (rows.length === 0) return [];
  const header = rows[0].map((value) => value.trim().toLowerCase());
  const mobileIdx = header.findIndex((value) => value.startsWith("mobile"));
  if (mobileIdx < 0) return [];
  const phones: string[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const phone = normalizeIndianMobile(rows[i][mobileIdx]);
    if (phone) phones.push(phone);
  }
  return phones;
}

export function sheetRowHasResult(csv: string, phone: string): boolean {
  const rows = parseCsv(csv);
  if (rows.length === 0) return false;
  const header = rows[0].map((value) => value.trim().toLowerCase());
  const mobileIdx = header.findIndex((value) => value.startsWith("mobile"));
  if (mobileIdx < 0) return false;
  for (let i = 1; i < rows.length; i += 1) {
    if (normalizeIndianMobile(rows[i][mobileIdx]) !== phone) continue;
    const line = rows[i].join(" ");
    if (line.includes("launch-game-result") || line.includes("RESULT Level")) return true;
  }
  return false;
}

async function fetchSheetCsv(): Promise<string> {
  const response = await fetch(`${sheetCsvUrl()}&rnd=${Date.now()}`, { redirect: "follow" });
  if (!response.ok) throw new Error(`Sheet returned HTTP ${response.status}`);
  const text = await response.text();
  if (!/mobile/i.test(text.slice(0, 400))) throw new Error("Sheet did not include a mobile column");
  return text;
}

export async function sheetHasMobile(phone: string): Promise<boolean> {
  if (seenPhones.has(phone)) return true;
  const phones = phonesInSheetCsv(await fetchSheetCsv());
  phones.forEach((item) => seenPhones.add(item));
  return seenPhones.has(phone);
}

export async function sheetHasSavedResult(phone: string): Promise<boolean> {
  return sheetRowHasResult(await fetchSheetCsv(), phone);
}

export function rememberPhone(phone: string): void {
  seenPhones.add(phone);
}

/** Appends one row through the existing Apps Script. Key order matches the live sheet. */
export async function appendLaunchRow(
  application: SheetApplication,
  options: { source: string; extra?: Record<string, string | number> },
): Promise<boolean> {
  const url = webhookUrl();
  if (!url) return false;
  const payload: Record<string, string | number> = {
    timestamp: new Date().toISOString(),
    name: application.name,
    phone: `+91${application.phone}`,
    age: application.age,
    sex: application.sex,
    gym: application.gym || "(not listed)",
    customGym: application.customGym || "—",
    instagram: application.instagram ? `@${application.instagram}` : "—",
    source: options.source,
  };
  for (const [key, value] of Object.entries(options.extra ?? {})) {
    payload[key] = value;
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });
    if (!response.ok) {
      console.warn(`[Launch] Google Sheet webhook returned HTTP ${response.status}`);
      return false;
    }
    return true;
  } catch (err: unknown) {
    console.error("[Launch] Failed to sync to Google Sheet:", err instanceof Error ? err.message : "error");
    return false;
  }
}
