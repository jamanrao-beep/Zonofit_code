"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
exports.createError = createError;
/**
 * Global error handler — catches anything thrown in route handlers.
 * Always returns structured JSON so the mobile app can parse errors uniformly.
 */
function errorHandler(err, _req, res, _next) {
    const statusCode = err.statusCode ?? 500;
    const isDev = process.env.NODE_ENV === "development";
    console.error(`[Error] ${statusCode} — ${err.message}`, isDev ? err.stack : "");
    res.status(statusCode).json({
        error: err.code ?? "InternalServerError",
        message: err.message ?? "An unexpected error occurred.",
        ...(isDev && { stack: err.stack }),
    });
}
/**
 * 404 handler — catches unmatched routes.
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        error: "NotFound",
        message: `Route ${req.method} ${req.path} not found.`,
    });
}
/**
 * Helper to create a typed error with an HTTP status code.
 */
function createError(message, statusCode, code) {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.code = code;
    return err;
}
//# sourceMappingURL=errorHandler.js.map