import { Router } from 'express';
import {
  register,
  login,
  forgotPasswordHandler,
  resetPasswordHandler,
} from '../controller/user.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);

export default router;
