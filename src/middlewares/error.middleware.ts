import { Request, Response, NextFunction } from 'express';

// Redeclare AppError locally so this middleware doesn't create a circular import
// by importing from utils/AppError.ts. The interface only needs status and code.
export interface AppError extends Error {
  status?: number;
  code?: number; // MongoDB driver error code — 11000 means duplicate key
}

// Global error handler — must be registered as the last middleware in app.ts.
// Express identifies error-handling middleware by the 4-argument signature (err, req, res, next).
// All uncaught errors from catchAsync() and explicit next(err) calls land here.
export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // CastError is thrown by Mongoose when an invalid ObjectId is passed to a query
  // (e.g. a 5-char string where a 24-char hex ID is expected). Map to 404.
  if (err.name === 'CastError') {
    res.status(404).json({ success: false, message: 'Resource not found' });
    return;
  }

  // Mongoose ValidationError fires when a document fails schema-level validation
  // (e.g. a required field is missing, or an enum value is invalid).
  if (err.name === 'ValidationError') {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  // MongoDB duplicate key error. code 11000 occurs when inserting/updating a document
  // that violates a unique index (e.g. two users with the same email).
  if (err.code === 11000) {
    res.status(409).json({ success: false, message: 'Already exists' });
    return;
  }

  // For AppError instances (intentional business-logic errors), err.status is set.
  // For unexpected errors (bugs, third-party failures), fall back to 500.
  const status = err.status ?? 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ success: false, message });
};
