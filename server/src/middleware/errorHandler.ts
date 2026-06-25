import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Global error handler — catches anything thrown in route handlers.
 * Always returns structured JSON so the mobile app can parse errors uniformly.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
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
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "NotFound",
    message: `Route ${req.method} ${req.path} not found.`,
  });
}

/**
 * Helper to create a typed error with an HTTP status code.
 */
export function createError(
  message: string,
  statusCode: number,
  code?: string
): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
