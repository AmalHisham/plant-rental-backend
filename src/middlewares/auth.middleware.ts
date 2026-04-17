import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { findUserById } from '../modules/user/service/user.service';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: string };

    const user = await findUserById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User no longer exists or is inactive' });
      return;
    }

    (req as AuthRequest).user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err: unknown) {
    const isExpired = err instanceof Error && err.name === 'TokenExpiredError';
    const message = isExpired
      ? 'Access token expired. Please refresh.'
      : 'Invalid token';
    res.status(401).json({ success: false, message });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    if (!authReq.user || !roles.includes(authReq.user.role)) {
      res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
      return;
    }
    next();
  };
};
