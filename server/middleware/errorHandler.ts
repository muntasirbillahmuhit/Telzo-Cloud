import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${statusCode} - ${message}`, err.details || '');

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(err.details ? { details: err.details } : {}),
      status: statusCode,
    },
  });
};
