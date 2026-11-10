import prisma from "./prisma";
import type { Application } from "../routes/launchOffer";

export type StoredGameResult = {
  level: number;
  outcome: string;
  you: number | null;
  zonofit: number | null;
};

export type EntryState = "missing" | "open" | "finished";

function isDuplicate(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const error = err as { code?: string; meta?: { code?: string | number }; message?: string };
  if (error.code === "P2002") return true;
  if (String(error.meta?.code ?? "") === "1062") return true;
  return /duplicate/i.test(error.message ?? "");
}

/** Whether this mobile already has a challenge entry. The phone is the primary key. */
export async function launchGamePhoneTaken(phone: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ phone: string }>>`
    SELECT phone FROM launch_game_entries WHERE phone = ${phone} LIMIT 1
  `;
  return rows.length > 0;
}

export async function launchGameEntryState(phone: string): Promise<EntryState> {
  const rows = await prisma.$queryRaw<Array<{ outcome: string | null }>>`
    SELECT outcome FROM launch_game_entries WHERE phone = ${phone} LIMIT 1
  `;
  if (!rows.length) return "missing";
  const outcome = rows[0]?.outcome;
  if (outcome == null || outcome === "") return "open";
  return "finished";
}

/** Inserts one row. A second insert for the same phone returns "duplicate". */
export async function insertLaunchGameEntry(application: Application, pid: string): Promise<"ok" | "duplicate"> {
  try {
    await prisma.$executeRaw`
      INSERT INTO launch_game_entries
        (phone, name, age, sex, gym, customGym, instagram, pid)
      VALUES (
        ${application.phone},
        ${application.name},
        ${application.age},
        ${application.sex},
        ${application.gym},
        ${application.customGym},
        ${application.instagram},
        ${pid}
      )
    `;
    return "ok";
  } catch (err: unknown) {
    if (isDuplicate(err)) return "duplicate";
    throw err;
  }
}

/** Drops an unfinished row so a failed sheet write does not burn the number. */
export async function deleteOpenLaunchGameEntry(phone: string): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM launch_game_entries
    WHERE phone = ${phone} AND outcome IS NULL
  `;
}

/** Records the finished game once. A later update does not replace it. */
export async function saveLaunchGameResult(phone: string, result: StoredGameResult): Promise<void> {
  await prisma.$executeRaw`
    UPDATE launch_game_entries
    SET level = ${result.level},
        outcome = ${result.outcome},
        youScore = ${result.you},
        zonofitScore = ${result.zonofit}
    WHERE phone = ${phone} AND outcome IS NULL
  `;
}
