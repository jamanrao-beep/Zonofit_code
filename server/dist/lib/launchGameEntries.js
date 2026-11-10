"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchGamePhoneTaken = launchGamePhoneTaken;
exports.launchGameEntryState = launchGameEntryState;
exports.insertLaunchGameEntry = insertLaunchGameEntry;
exports.deleteOpenLaunchGameEntry = deleteOpenLaunchGameEntry;
exports.saveLaunchGameResult = saveLaunchGameResult;
const prisma_1 = __importDefault(require("./prisma"));
function isDuplicate(err) {
    if (!err || typeof err !== "object")
        return false;
    const error = err;
    if (error.code === "P2002")
        return true;
    if (String(error.meta?.code ?? "") === "1062")
        return true;
    return /duplicate/i.test(error.message ?? "");
}
/** Whether this mobile already has a challenge entry. The phone is the primary key. */
async function launchGamePhoneTaken(phone) {
    const rows = await prisma_1.default.$queryRaw `
    SELECT phone FROM launch_game_entries WHERE phone = ${phone} LIMIT 1
  `;
    return rows.length > 0;
}
async function launchGameEntryState(phone) {
    const rows = await prisma_1.default.$queryRaw `
    SELECT outcome FROM launch_game_entries WHERE phone = ${phone} LIMIT 1
  `;
    if (!rows.length)
        return "missing";
    const outcome = rows[0]?.outcome;
    if (outcome == null || outcome === "")
        return "open";
    return "finished";
}
/** Inserts one row. A second insert for the same phone returns "duplicate". */
async function insertLaunchGameEntry(application, pid) {
    try {
        await prisma_1.default.$executeRaw `
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
    }
    catch (err) {
        if (isDuplicate(err))
            return "duplicate";
        throw err;
    }
}
/** Drops an unfinished row so a failed sheet write does not burn the number. */
async function deleteOpenLaunchGameEntry(phone) {
    await prisma_1.default.$executeRaw `
    DELETE FROM launch_game_entries
    WHERE phone = ${phone} AND outcome IS NULL
  `;
}
/** Records the finished game once. A later update does not replace it. */
async function saveLaunchGameResult(phone, result) {
    await prisma_1.default.$executeRaw `
    UPDATE launch_game_entries
    SET level = ${result.level},
        outcome = ${result.outcome},
        youScore = ${result.you},
        zonofitScore = ${result.zonofit}
    WHERE phone = ${phone} AND outcome IS NULL
  `;
}
//# sourceMappingURL=launchGameEntries.js.map