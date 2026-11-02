"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadsDir = getUploadsDir;
exports.getAllCandidateUploadDirs = getAllCandidateUploadDirs;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Returns the primary directory used for saving file uploads.
 * If UPLOADS_DIR env var is set, uses that.
 * Otherwise resolves to server/uploads or uploads directory.
 */
function getUploadsDir() {
    if (process.env.UPLOADS_DIR) {
        const custom = path_1.default.resolve(process.env.UPLOADS_DIR);
        if (!fs_1.default.existsSync(custom)) {
            fs_1.default.mkdirSync(custom, { recursive: true });
        }
        return custom;
    }
    const candidates = [
        path_1.default.resolve(process.cwd(), "server/uploads"),
        path_1.default.resolve(process.cwd(), "uploads"),
        path_1.default.resolve(__dirname, "../../uploads"),
        path_1.default.resolve(__dirname, "../uploads"),
    ];
    for (const dir of candidates) {
        if (fs_1.default.existsSync(dir)) {
            return dir;
        }
    }
    // Fallback to first existing candidate or create server/uploads
    const fallback = candidates[0];
    try {
        fs_1.default.mkdirSync(fallback, { recursive: true });
        return fallback;
    }
    catch {
        const secondary = path_1.default.resolve(__dirname, "../uploads");
        fs_1.default.mkdirSync(secondary, { recursive: true });
        return secondary;
    }
}
/**
 * Returns all potential candidate upload directories so Express static
 * file serving can find files regardless of whether the app was launched
 * from root, from server/, or via PM2 in production.
 */
function getAllCandidateUploadDirs() {
    const dirs = new Set();
    if (process.env.UPLOADS_DIR) {
        dirs.add(path_1.default.resolve(process.env.UPLOADS_DIR));
    }
    dirs.add(path_1.default.resolve(process.cwd(), "server/uploads"));
    dirs.add(path_1.default.resolve(process.cwd(), "uploads"));
    dirs.add(path_1.default.resolve(__dirname, "../../uploads"));
    dirs.add(path_1.default.resolve(__dirname, "../uploads"));
    dirs.add(path_1.default.resolve(__dirname, "../../../uploads"));
    return Array.from(dirs);
}
//# sourceMappingURL=uploads.js.map