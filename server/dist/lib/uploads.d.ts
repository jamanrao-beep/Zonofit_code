/**
 * Returns the primary directory used for saving file uploads.
 * If UPLOADS_DIR env var is set, uses that.
 * Otherwise resolves to server/uploads or uploads directory.
 */
export declare function getUploadsDir(): string;
/**
 * Returns all potential candidate upload directories so Express static
 * file serving can find files regardless of whether the app was launched
 * from root, from server/, or via PM2 in production.
 */
export declare function getAllCandidateUploadDirs(): string[];
//# sourceMappingURL=uploads.d.ts.map