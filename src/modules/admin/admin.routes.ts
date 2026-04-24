import { Router } from 'express';
import { protect, authorizeRoles } from '../../middlewares/auth.middleware';
import {
  getDashboardStatsHandler,
  getAllOrdersAdminHandler,
  createAdminHandler,
} from './admin.controller';
import { catchAsync } from '../../utils/catchAsync';

const router = Router();

// Dashboard is super_admin only — it exposes aggregate financial and operational data.
router.get('/dashboard', protect, authorizeRoles('super_admin'), catchAsync(getDashboardStatsHandler));

// order_admin can view all orders but cannot access the dashboard or create admins.
router.get('/orders', protect, authorizeRoles('super_admin', 'order_admin'), catchAsync(getAllOrdersAdminHandler));

// Only super_admin can provision new admin accounts — prevents privilege escalation.
router.post('/create-admin', protect, authorizeRoles('super_admin'), catchAsync(createAdminHandler));

export default router;
