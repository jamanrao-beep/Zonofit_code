import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BANNED_SECRETS = new Set([
  "zonofit_super_secret_key_1234567890",
  "changeme",
  "secret",
]);

export interface TokenPayload {
  dbUserId: string;
  phone?: string;
  systemRole?: string;
  iat: number;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET?.trim() ?? "";
  if (secret.length < 32 || BANNED_SECRETS.has(secret)) {
    throw new Error("JWT_SECRET must be set to a unique value of at least 32 characters.");
  }
  return secret;
}

function sign(payloadStr: string): string {
  return createHmac("sha256", getSecret()).update(payloadStr).digest("base64url");
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBuf = Buffer.from(actual);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(actualBuf, expectedBuf);
}

export function signToken(payload: Omit<TokenPayload, "iat" | "exp">): string {
  const now = Date.now();
  const full: TokenPayload = { ...payload, iat: now, exp: now + TOKEN_TTL_MS };
  const payloadStr = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${payloadStr}.${sign(payloadStr)}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadStr, signature] = parts;
  let expectedSignature: string;
  try {
    expectedSignature = sign(payloadStr);
  } catch {
    return null;
  }

  if (!signaturesMatch(signature, expectedSignature)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf8")) as TokenPayload;
    if (!parsed?.dbUserId || typeof parsed.exp !== "number" || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}
