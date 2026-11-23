import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";
import { generateUniqueReferralCode } from "./referral";

type OwnerClient = Prisma.TransactionClient | PrismaClient;

/** Matches portal sign-in, which strips Gmail dots and +tags before lookup. */
function canonicalLoginEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const base = local.split("+")[0].replace(/\./g, "");
    return `${base}@gmail.com`;
  }
  return email;
}

export function cleanOwnerEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = canonicalLoginEmail(value.trim().toLowerCase());
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return null;
  return email;
}

export function cleanOwnerPassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length < 8 || value.length > 72) return null;
  return value;
}

/** Admin-assigned gym portal username. Symbols are allowed. Spaces are not. */
export function cleanPortalUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const username = value.trim();
  if (username.length < 3 || username.length > 64) return null;
  if (/[\u0000-\u001F\u007F\s]/.test(username)) return null;
  return username;
}

/** Admin-assigned gym portal passkey. Any characters, stored only as a hash. */
export function cleanOwnerPasskey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length < 6 || value.length > 72) return null;
  return value;
}

export type OwnerCredentialInput = {
  username: string | null;
  password: string | null;
  passkey: string | null;
  usernameProvided: boolean;
  passwordProvided: boolean;
  passkeyProvided: boolean;
};

export function readOwnerCredentials(body: {
  ownerUsername?: unknown;
  ownerPassword?: unknown;
  ownerPasskey?: unknown;
}): { ok: true; value: OwnerCredentialInput } | { ok: false; message: string } {
  const usernameRaw = typeof body.ownerUsername === "string" ? body.ownerUsername : "";
  const passwordRaw = typeof body.ownerPassword === "string" ? body.ownerPassword : "";
  const passkeyRaw = typeof body.ownerPasskey === "string" ? body.ownerPasskey : "";
  const usernameProvided = usernameRaw.trim() !== "";
  const passwordProvided = passwordRaw.length > 0;
  const passkeyProvided = passkeyRaw.length > 0;
  const username = usernameProvided ? cleanPortalUsername(usernameRaw) : null;
  const password = passwordProvided ? cleanOwnerPassword(passwordRaw) : null;
  const passkey = passkeyProvided ? cleanOwnerPasskey(passkeyRaw) : null;
  if (usernameProvided && !username) {
    return { ok: false, message: "Username must be 3 to 64 characters, with no spaces. Symbols are allowed." };
  }
  if (passwordProvided && !password) {
    return { ok: false, message: "Password must be 8 to 72 characters." };
  }
  if (passkeyProvided && !passkey) {
    return { ok: false, message: "Passkey must be 6 to 72 characters." };
  }
  return {
    ok: true,
    value: { username, password, passkey, usernameProvided, passwordProvided, passkeyProvided },
  };
}

export function accountConflictMessage(err: unknown): string | null {
  if ((err as { code?: string }).code !== "P2002") return null;
  const target = (err as { meta?: { target?: unknown } }).meta?.target;
  const fields = Array.isArray(target) ? target.join(" ") : String(target ?? "");
  if (/portalUsername/i.test(fields)) return "That username is already used.";
  if (/customGymId/i.test(fields)) return "That gym ID is already used.";
  return "That username or gym ID is already used.";
}

const ownerSelect = { id: true, name: true, portalUsername: true } as const;

function internalOwnerEmail(): string {
  return `gym.${randomUUID()}@owners.zonofit.internal`;
}

export async function createGymOwner(
  db: OwnerClient,
  input: { username: string; password: string; passkey: string; name: string },
) {
  const [passwordHash, passkeyHash] = await Promise.all([
    bcrypt.hash(input.password, 12),
    bcrypt.hash(input.passkey, 12),
  ]);
  const referralCode = await generateUniqueReferralCode();
  return db.user.create({
    data: {
      email: internalOwnerEmail(),
      name: input.name,
      portalUsername: input.username,
      passwordHash,
      passkeyHash,
      systemRole: "GYM_OWNER",
      referralCode,
      wallet: {
        create: {
          balance: 0,
          convertibleCashBalanceInPaise: 0,
          nonConvertibleCashBalanceInPaise: 0,
        },
      },
    },
    select: ownerSelect,
  });
}

export async function updateGymOwnerLogin(
  db: OwnerClient,
  userId: string,
  input: { username?: string; password?: string; passkey?: string; name?: string },
) {
  const data: { portalUsername?: string; passwordHash?: string; passkeyHash?: string; name?: string } = {};
  if (input.username) data.portalUsername = input.username;
  if (input.name) data.name = input.name;
  if (input.password) data.passwordHash = await bcrypt.hash(input.password, 12);
  if (input.passkey) data.passkeyHash = await bcrypt.hash(input.passkey, 12);
  if (Object.keys(data).length === 0) {
    return db.user.findUnique({ where: { id: userId }, select: ownerSelect });
  }
  return db.user.update({
    where: { id: userId },
    data,
    select: ownerSelect,
  });
}

export async function portalUsernameTaken(
  db: OwnerClient,
  username: string,
  exceptUserId?: string,
): Promise<boolean> {
  const existing = await db.user.findFirst({
    where: { portalUsername: username },
    select: { id: true },
  });
  return !!existing && existing.id !== exceptUserId;
}
