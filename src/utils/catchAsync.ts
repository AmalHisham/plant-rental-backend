import { Request, Response, NextFunction } from 'express';

// Higher-order wrapper that converts a rejected Promise into a call to next(err).
// Without this, an unhandled async rejection in a route handler crashes the process
// instead of being caught by the global errorHandler middleware.
// Usage: router.post('/route', catchAsync(async (req, res) => { ... }))
export const catchAsync = (
  fn: (req: any, res: Response, next: NextFunction) => Promise<void>
) => {
  // Returns a standard Express (req, res, next) handler. The outer function signature
  // is what Express registers; the inner fn is called inside it and any rejection
  // is forwarded to next() so errorHandler can format the response.
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};
