"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const admin_controller_1 = require("../controller/admin.controller");
const catchAsync_1 = require("../../../utils/catchAsync");
const router = (0, express_1.Router)();
// Admin endpoints stay behind explicit role checks so the privileges are obvious.
router.get('/dashboard', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('super_admin'), (0, catchAsync_1.catchAsync)(admin_controller_1.getDashboardStatsHandler));
router.get('/orders', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('super_admin', 'order_admin'), (0, catchAsync_1.catchAsync)(admin_controller_1.getAllOrdersAdminHandler));
router.post('/create-admin', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('super_admin'), (0, catchAsync_1.catchAsync)(admin_controller_1.createAdminHandler));
exports.default = router;
