"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../lib/prisma"));
/**
 * Run this on the Hostinger machine after ADMIN_PASSWORD is set in server/.env.
 * It updates the stored hash. It does not print the password.
 */
async function main() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD ?? "";
    if (!email || password.length < 12 || password.toLowerCase().includes("password")) {
        console.error("Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 12 characters.");
        process.exit(1);
    }
    const user = await prisma_1.default.user.findFirst({ where: { email } });
    if (!user) {
        console.error("No user exists for ADMIN_EMAIL.");
        process.exit(1);
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    await prisma_1.default.user.update({
        where: { id: user.id },
        data: { passwordHash, systemRole: "ADMIN" },
    });
    console.log("Updated the admin password hash.");
}
main()
    .catch((err) => {
    console.error("Could not update the admin password.");
    console.error(err instanceof Error ? err.message : "Unknown error");
    process.exit(1);
})
    .finally(async () => {
    await prisma_1.default.$disconnect();
});
//# sourceMappingURL=rotateAdminPassword.js.map