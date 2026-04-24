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

// ── User-only routes ──────────────────────────────────────────────────────────
// Only the 'user' role can create orders and view their own orders.
// Admin roles are intentionally excluded here — admins view orders via /api/admin/orders.
router.post('/', protect, authorizeRoles('user'), catchAsync(createOrderHandler));
router.post('/checkout', protect, authorizeRoles('user'), catchAsync(checkoutHandler));
router.get('/', protect, authorizeRoles('user'), catchAsync(getMyOrdersHandler));

// ── Delivery admin: update delivery status ────────────────────────────────────
// Status transitions: booked → delivered → picked. Only delivery_admin manages this.
router.patch('/:id/status', protect, authorizeRoles('super_admin', 'delivery_admin'), catchAsync(updateStatusHandler));

// ── Order admin: damage assessment and deposit refund ─────────────────────────
// These are separated from status to allow the ops team (delivery) and finance team
// (order_admin) to work independently.
router.patch('/:id/damage', protect, authorizeRoles('super_admin', 'order_admin'), catchAsync(updateDamageHandler));
router.patch('/:id/deposit', protect, authorizeRoles('super_admin', 'order_admin'), catchAsync(updateDepositHandler));

export default router;
