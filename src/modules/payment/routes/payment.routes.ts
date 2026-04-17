import { Router } from 'express';
import { protect, authorizeRoles } from '../../../middlewares/auth.middleware';
import { catchAsync } from '../../../utils/catchAsync';
import {
  createPaymentOrderHandler,
  verifyPaymentHandler,
} from '../controller/payment.controller';

const router = Router();

router.post('/create-order', protect, authorizeRoles('user'), catchAsync(createPaymentOrderHandler));
router.post('/verify', protect, authorizeRoles('user'), catchAsync(verifyPaymentHandler));

export default router;
