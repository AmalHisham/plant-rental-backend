import { Router } from 'express';
import {
  register,
  login,
  forgotPasswordHandler,
  resetPasswordHandler,
  refreshTokenHandler,
  logoutHandler,
} from '../controller/user.controller';
import { catchAsync } from '../../../utils/catchAsync';
import { protect } from '../../../middlewares/auth.middleware';

const router = Router();

router.post('/register', catchAsync(register));
router.post('/login', catchAsync(login));
router.post('/forgot-password', catchAsync(forgotPasswordHandler));
router.post('/reset-password', catchAsync(resetPasswordHandler));
router.post('/refresh-token', catchAsync(refreshTokenHandler));
router.post('/logout', protect, catchAsync(logoutHandler));

export default router;
