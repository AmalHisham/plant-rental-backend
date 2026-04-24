import { Router } from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  forgotPasswordHandler,
  resetPasswordHandler,
  refreshTokenHandler,
  logoutHandler,
  getAllUsersHandler,
  getUserByIdHandler,
  updateUserStatusHandler,
  deleteUserHandler,
} from '../controller/user.controller';
import { catchAsync } from '../../../utils/catchAsync';
import { protect, authorizeRoles } from '../../../middlewares/auth.middleware';

// ─── Rate Limiters ────────────────────────────────────────────────────────────
// Applied per-route to slow down brute-force attacks on credentials.
// standardHeaders: true adds the RateLimit-* headers (RFC 6585) to responses.
// legacyHeaders: false suppresses the older X-RateLimit-* headers.

// 10 login/register attempts per IP per 15 minutes.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5 forgot-password requests per IP per hour — stricter because each one triggers an email.
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many password reset attempts, please try again after 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// ─── Public Auth Routes (/api/auth) ───────────────────────────────────────────
// All handlers wrapped with catchAsync so async rejections reach the global errorHandler.

router.post('/register', authLimiter, catchAsync(register));
router.post('/login', authLimiter, catchAsync(login));
router.post('/forgot-password', forgotPasswordLimiter, catchAsync(forgotPasswordHandler));
router.post('/reset-password', catchAsync(resetPasswordHandler));
router.post('/refresh-token', catchAsync(refreshTokenHandler));
router.post('/logout', protect, catchAsync(logoutHandler)); // protect: must be logged in to log out

// ─── Google OAuth Routes ──────────────────────────────────────────────────────
// Step 1: Redirect the browser to Google's consent screen.
// scope: ['profile', 'email'] requests the minimal claims we need.
// session: false — we use JWT, not server-side sessions.
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// Step 2: Google redirects back here after user consents.
// Custom callback (instead of the default passport.authenticate middleware) lets us
// control the redirect URL and embed tokens in the query string for the SPA to read.
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err: Error | null, user: Express.User | false | null) => {
    if (err || !user) {
      // On failure, redirect to login with an error flag so the frontend can show a message.
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
    const { accessToken, refreshToken } = user as unknown as { accessToken: string; refreshToken: string };
    // Tokens are passed as query params because the browser can't read response headers
    // after a redirect. The SPA (GoogleCallbackPage) reads them from the URL, stores
    // them in localStorage, and strips the query string before routing the user.
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`
    );
  })(req, res, next);
});

export default router;

// ─── Admin-Only User Management Router (/api/users) ───────────────────────────
// Exported as a named export so app.ts can mount it under a different path (/api/users)
// while keeping auth routes under /api/auth without polluting the default export.
export const usersRouter = Router();

usersRouter.get(
  '/',
  protect,
  authorizeRoles('super_admin', 'user_admin'), // user_admin can list/view but cannot delete
  catchAsync(getAllUsersHandler)
);

usersRouter.get(
  '/:id',
  protect,
  authorizeRoles('super_admin', 'user_admin'),
  catchAsync(getUserByIdHandler)
);

usersRouter.patch(
  '/:id/status',
  protect,
  authorizeRoles('super_admin', 'user_admin'),
  catchAsync(updateUserStatusHandler)
);

usersRouter.delete(
  '/:id',
  protect,
  authorizeRoles('super_admin'), // only super_admin can hard-delete users
  catchAsync(deleteUserHandler)
);
