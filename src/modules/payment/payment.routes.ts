import { Router } from 'express';
import { protect, authorizeRoles } from '../../middlewares/auth.middleware';
import { catchAsync } from '../../utils/catchAsync';
import {
  createPaymentOrderHandler,
  verifyPaymentHandler,
} from './payment.controller';

const router = Router();

// Both payment endpoints are restricted to the 'user' role.
// Admins should not be able to trigger payments on behalf of users.
router.post('/create-order', protect, authorizeRoles('user'), catchAsync(createPaymentOrderHandler));
router.post('/verify', protect, authorizeRoles('user'), catchAsync(verifyPaymentHandler));

export default router;
