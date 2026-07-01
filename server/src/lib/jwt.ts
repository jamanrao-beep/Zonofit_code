import { createHmac } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "zonofit_super_secret_key_1234567890";

export interface TokenPayload {
  dbUserId: string;
  phone?: string;
  systemRole?: string;
  createdAt: number;
}

/**
 * signToken — Generates a stateless session token.
 * Format: base64url(payload).base64url(signature)
 */
export function signToken(payload: TokenPayload): string {
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", JWT_SECRET)
    .update(payloadStr)
    .digest("base64url");
  return `${payloadStr}.${signature}`;
}

/**
 * verifyToken — Verifies a stateless session token and returns the parsed payload.
 * Returns null if invalid or expired.
 */
export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadStr, signature] = parts;
  const expectedSignature = createHmac("sha256", JWT_SECRET)
    .update(payloadStr)
    .digest("base64url");

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(payloadStr, "base64url").toString("utf8");
    return JSON.parse(jsonStr) as TokenPayload;
  } catch {
    return null;
  }
}
