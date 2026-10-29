"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSchema = ensureSchema;
const prisma_1 = __importDefault(require("./prisma"));
const STATEMENTS = [
    "ALTER TABLE `payment_orders` ADD COLUMN `purpose` VARCHAR(32) NOT NULL DEFAULT 'CREDITS'",
    "ALTER TABLE `payment_orders` ADD COLUMN `metaJson` TEXT NULL",
    "UPDATE `users` SET `phone` = NULL WHERE `phone` = ''",
    `CREATE TABLE IF NOT EXISTS \`otp_codes\` (
    \`phone\` VARCHAR(64) NOT NULL,
    \`codeHash\` VARCHAR(64) NOT NULL,
    \`expiresAt\` DATETIME(3) NOT NULL,
    \`attempts\` INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (\`phone\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS \`rate_limits\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`count\` INTEGER NOT NULL,
    \`resetAt\` DATETIME(3) NOT NULL,
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    "ALTER TABLE `otp_codes` MODIFY `phone` VARCHAR(64) NOT NULL",
];
function safeDbMessage(err) {
    const message = String(err?.message ?? "");
    if (/\d{8,}/.test(message))
        return "database error";
    return message.slice(0, 240);
}
/** Adds columns and tables introduced after the first MySQL deploy. Safe to run on every boot. */
async function ensureSchema() {
    for (const sql of STATEMENTS) {
        try {
            await prisma_1.default.$executeRawUnsafe(sql);
        }
        catch (err) {
            const message = safeDbMessage(err);
            if (/duplicate|exists|check that column/i.test(message))
                continue;
            console.warn("[ensureSchema]", message);
        }
    }
    await ensureUniquePhones();
}
async function phoneIndexExists() {
    const rows = await prisma_1.default.$queryRaw `
    SELECT COUNT(*) AS n
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND index_name = 'users_phone_key'
  `;
    return Number(rows[0]?.n ?? 0) > 0;
}
/** Phones that are not already the stored 10-digit form. */
async function countNonCanonicalPhones() {
    try {
        const rows = await prisma_1.default.$queryRaw `
      SELECT COUNT(*) AS n FROM users
      WHERE phone IS NOT NULL AND phone <> '' AND phone NOT REGEXP '^[0-9]{10}$'
    `;
        return Number(rows[0]?.n ?? 0);
    }
    catch {
        return 1;
    }
}
async function dropPhoneIndex() {
    try {
        await prisma_1.default.$executeRawUnsafe("DROP INDEX `users_phone_key` ON `users`");
    }
    catch (err) {
        const message = safeDbMessage(err);
        if (/check that|doesn't exist|does not exist|can't drop|1091/i.test(message))
            return;
        console.warn("[ensureSchema]", message);
    }
}
async function normalizeStoredPhones(db) {
    await db.$executeRawUnsafe(`
    UPDATE \`users\`
    SET \`phone\` = RIGHT(REGEXP_REPLACE(\`phone\`, '[^0-9]', ''), 10)
    WHERE \`phone\` IS NOT NULL AND CHAR_LENGTH(\`phone\`) > 0
  `);
    await db.$executeRawUnsafe(`
    UPDATE \`users\`
    SET \`phone\` = NULL
    WHERE \`phone\` IS NOT NULL AND CHAR_LENGTH(\`phone\`) <> 10
  `);
}
/** Keeps the oldest account for each number and clears the rest. Returns rows cleared. */
async function clearDuplicatePhones(db) {
    const cleared = await db.$executeRawUnsafe(`
    UPDATE \`users\` AS newer
    INNER JOIN \`users\` AS older
      ON newer.\`phone\` = older.\`phone\`
     AND newer.\`phone\` IS NOT NULL
     AND newer.\`phone\` <> ''
     AND (
       newer.\`createdAt\` > older.\`createdAt\`
       OR (newer.\`createdAt\` = older.\`createdAt\` AND newer.\`id\` > older.\`id\`)
     )
    SET newer.\`phone\` = NULL
  `);
    return Number(cleared);
}
async function ensureUniquePhones() {
    try {
        const indexReady = await phoneIndexExists();
        const messy = await countNonCanonicalPhones();
        if (indexReady && messy === 0)
            return;
        await dropPhoneIndex();
        try {
            await prisma_1.default.$transaction(async (tx) => {
                await tx.$executeRawUnsafe("SET SESSION sql_safe_updates = 0");
                await normalizeStoredPhones(tx);
            });
        }
        catch (err) {
            console.warn("[ensureSchema] Phone numbers were not rewritten to 10 digits.", safeDbMessage(err));
        }
        let cleared = 0;
        try {
            cleared = await prisma_1.default.$transaction(async (tx) => {
                await tx.$executeRawUnsafe("SET SESSION sql_safe_updates = 0");
                return clearDuplicatePhones(tx);
            });
        }
        catch (err) {
            console.warn("[ensureSchema] Duplicate phone cleanup did not finish.", safeDbMessage(err));
        }
        if (cleared > 0) {
            console.warn(`[ensureSchema] Cleared ${cleared} duplicate phone values. The oldest account kept each number.`);
        }
        await prisma_1.default.$executeRawUnsafe("CREATE UNIQUE INDEX `users_phone_key` ON `users`(`phone`)");
    }
    catch (err) {
        const message = safeDbMessage(err);
        if (/duplicate key name|already exists/i.test(message))
            return;
        if (/duplicate entry/i.test(message)) {
            console.warn("[ensureSchema] Unique phone index was not created because some numbers are still shared.");
            return;
        }
        console.warn("[ensureSchema]", message);
    }
}
//# sourceMappingURL=ensureSchema.js.map