// Entry point bridge for cloud platforms expecting server.js
const { execSync } = require("child_process");

try {
  console.log("[Startup] Syncing database schema with Prisma...");
  execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
  console.log("[Startup] Database schema synced successfully.");
} catch (err) {
  console.warn("[Startup] Notice: Prisma db push skipped or failed:", err.message);
}

require("./dist/index.js");
