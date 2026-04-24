import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { findUserById } from '../modules/user/service/user.service';

// Extends Express's Request type so downstream handlers can read req.user
// without casting. Using an interface (not a type alias) allows declaration merging
// if other modules need to extend it further.
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string; // used by authorizeRoles() to enforce RBAC
  };
}

// ─── protect ─────────────────────────────────────────────────────────────────
// Validates the Bearer JWT and attaches the decoded identity to req.user.
// Called before any route that requires a logged-in user.
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  // Authorization header must be present and use the "Bearer <token>" scheme.
  // Other schemes (Basic, Digest) are rejected here.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1]; // index 1 is the token; index 0 is "Bearer"

  try {
    // jwt.verify() throws if the token is expired, tampered, or signed with the wrong secret.
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: string };

    // DB lookup ensures that deleted or deactivated accounts can't keep using old tokens
    // that haven't expired yet. The token's cryptographic validity alone is not enough.
    const user = await findUserById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User no longer exists or is inactive' });
      return;
    }

    // Attach minimal identity to the request — id and role are enough for all downstream checks.
    (req as AuthRequest).user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err: unknown) {
    // Distinguish expired tokens from outright invalid ones so the client can
    // react differently (retry with refresh token vs. redirect to login).
    const isExpired = err instanceof Error && err.name === 'TokenExpiredError';
    const message = isExpired
      ? 'Access token expired. Please refresh.'
      : 'Invalid token';
    res.status(401).json({ success: false, message });
  }
};

// ─── authorizeRoles ───────────────────────────────────────────────────────────
// Role-based access control guard. Must be used AFTER protect, which populates req.user.
// Accepts a variadic list of allowed roles so a single route can permit multiple roles:
//   authorizeRoles('super_admin', 'order_admin')
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    // roles.includes() is O(n) but role lists are tiny (max ~5 entries), so it's fine.
    if (!authReq.user || !roles.includes(authReq.user.role)) {
      res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
      return;
    }
    next();
  };
};
