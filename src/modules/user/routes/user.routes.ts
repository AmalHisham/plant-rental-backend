import { Router } from 'express';
import passport from 'passport';
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

const router = Router();

router.post('/register', catchAsync(register));
router.post('/login', catchAsync(login));
router.post('/forgot-password', catchAsync(forgotPasswordHandler));
router.post('/reset-password', catchAsync(resetPasswordHandler));
router.post('/refresh-token', catchAsync(refreshTokenHandler));
router.post('/logout', protect, catchAsync(logoutHandler));

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err: Error | null, user: Express.User | false | null) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
    const { accessToken, refreshToken } = user as unknown as { accessToken: string; refreshToken: string };
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`
    );
  })(req, res, next);
});

export default router;

// ─── User Management Router (/api/users) ─────────────────────────────────────

export const usersRouter = Router();

usersRouter.get(
  '/',
  protect,
  authorizeRoles('super_admin', 'user_admin'),
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
  authorizeRoles('super_admin'),
  catchAsync(deleteUserHandler)
);
