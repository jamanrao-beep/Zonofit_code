// Entry point bridge for cloud platforms expecting server.js
const { execSync } = require("child_process");
const path = require("path");

try {
  console.log("[Startup] Syncing database schema with Prisma...");
  const prismaBin = path.join(__dirname, "node_modules", "prisma", "build", "index.js");
  execSync(`node "${prismaBin}" db push --accept-data-loss`, {
    stdio: "inherit",
    env: process.env,
  });
  console.log("[Startup] Database schema synced successfully.");
} catch (err) {
  console.warn("[Startup] Notice: Direct prisma db push error, trying fallback:", err.message);
  try {
    execSync("npx prisma db push --accept-data-loss", { stdio: "inherit", env: process.env });
  } catch (fallbackErr) {
    console.warn("[Startup] Notice: Prisma fallback db push also skipped:", fallbackErr.message);
  }
}

require("./dist/index.js");

