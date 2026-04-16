import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
  code?: number;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Invalid MongoDB ObjectId
  if (err.name === 'CastError') {
    res.status(404).json({ success: false, message: 'Resource not found' });
    return;
  }

  // Mongoose schema validation failure
  if (err.name === 'ValidationError') {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  // Duplicate key (e.g. unique email)
  if (err.code === 11000) {
    res.status(409).json({ success: false, message: 'Already exists' });
    return;
  }

  const status = err.status ?? 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ success: false, message });
};
