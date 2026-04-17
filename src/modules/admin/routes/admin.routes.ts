import { Router } from 'express';
import { protect, authorizeRoles } from '../../../middlewares/auth.middleware';
import {
  getDashboardStatsHandler,
  getAllOrdersAdminHandler,
  createAdminHandler,
} from '../controller/admin.controller';
import { catchAsync } from '../../../utils/catchAsync';

const router = Router();

router.get('/dashboard', protect, authorizeRoles('super_admin'), catchAsync(getDashboardStatsHandler));
router.get('/orders', protect, authorizeRoles('super_admin', 'order_admin'), catchAsync(getAllOrdersAdminHandler));
router.post('/create-admin', protect, authorizeRoles('super_admin'), catchAsync(createAdminHandler));

export default router;
