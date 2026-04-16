import { Request, Response, NextFunction } from 'express';

export const catchAsync = (
  fn: (req: any, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};
