import path from "path";
import fs from "fs";

/**
 * Returns the primary directory used for saving file uploads.
 * If UPLOADS_DIR env var is set, uses that.
 * Otherwise resolves to server/uploads or uploads directory.
 */
export function getUploadsDir(): string {
  if (process.env.UPLOADS_DIR) {
    const custom = path.resolve(process.env.UPLOADS_DIR);
    if (!fs.existsSync(custom)) {
      fs.mkdirSync(custom, { recursive: true });
    }
    return custom;
  }

  const candidates = [
    path.resolve(process.cwd(), "server/uploads"),
    path.resolve(process.cwd(), "uploads"),
    path.resolve(__dirname, "../../uploads"),
    path.resolve(__dirname, "../uploads"),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  // Fallback to first existing candidate or create server/uploads
  const fallback = candidates[0];
  try {
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  } catch {
    const secondary = path.resolve(__dirname, "../uploads");
    fs.mkdirSync(secondary, { recursive: true });
    return secondary;
  }
}

/**
 * Returns all potential candidate upload directories so Express static
 * file serving can find files regardless of whether the app was launched
 * from root, from server/, or via PM2 in production.
 */
export function getAllCandidateUploadDirs(): string[] {
  const dirs = new Set<string>();
  if (process.env.UPLOADS_DIR) {
    dirs.add(path.resolve(process.env.UPLOADS_DIR));
  }
  dirs.add(path.resolve(process.cwd(), "server/uploads"));
  dirs.add(path.resolve(process.cwd(), "uploads"));
  dirs.add(path.resolve(__dirname, "../../uploads"));
  dirs.add(path.resolve(__dirname, "../uploads"));
  dirs.add(path.resolve(__dirname, "../../../uploads"));

  return Array.from(dirs);
}

/** Absolute public URL for a file under /uploads, even if it was saved with a local host. */
export function publicUploadUrl(stored: string): string {
  const trimmed = stored.trim();
  if (!trimmed) return "";
  const base = (process.env.PUBLIC_API_URL || "https://api.zonofit.com").replace(/\/$/, "");
  if (trimmed.startsWith("/uploads/")) return `${base}${trimmed}`;
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/uploads/")) return `${base}${parsed.pathname}`;
  } catch {
    return "";
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : "";
}
