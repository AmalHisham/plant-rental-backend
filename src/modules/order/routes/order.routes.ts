import { Router } from 'express';
import { protect, authorizeRoles } from '../../../middlewares/auth.middleware';
import {
  createOrderHandler,
  getMyOrdersHandler,
  updateStatusHandler,
  updateDamageHandler,
  updateDepositHandler,
  checkoutHandler,
} from '../controller/order.controller';
import { catchAsync } from '../../../utils/catchAsync';

const router = Router();

// User: place order and view own orders
router.post('/', protect, authorizeRoles('user'), catchAsync(createOrderHandler));
router.post('/checkout', protect, authorizeRoles('user'), catchAsync(checkoutHandler));
router.get('/', protect, authorizeRoles('user'), catchAsync(getMyOrdersHandler));

// Delivery admin: update delivery status
router.patch('/:id/status', protect, authorizeRoles('super_admin', 'delivery_admin'), catchAsync(updateStatusHandler));

// Order admin: record damage and handle deposit
router.patch('/:id/damage', protect, authorizeRoles('super_admin', 'order_admin'), catchAsync(updateDamageHandler));
router.patch('/:id/deposit', protect, authorizeRoles('super_admin', 'order_admin'), catchAsync(updateDepositHandler));

export default router;
