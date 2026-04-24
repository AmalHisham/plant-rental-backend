"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const order_controller_1 = require("../controller/order.controller");
const catchAsync_1 = require("../../../utils/catchAsync");
const router = (0, express_1.Router)();
// User: place order and view own orders
// Grouping by role makes the access rules easy to audit during review.
router.post('/', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('user'), (0, catchAsync_1.catchAsync)(order_controller_1.createOrderHandler));
router.post('/checkout', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('user'), (0, catchAsync_1.catchAsync)(order_controller_1.checkoutHandler));
router.get('/', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('user'), (0, catchAsync_1.catchAsync)(order_controller_1.getMyOrdersHandler));
// Delivery admin: update delivery status
router.patch('/:id/status', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('super_admin', 'delivery_admin'), (0, catchAsync_1.catchAsync)(order_controller_1.updateStatusHandler));
// Order admin: record damage and handle deposit
router.patch('/:id/damage', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('super_admin', 'order_admin'), (0, catchAsync_1.catchAsync)(order_controller_1.updateDamageHandler));
router.patch('/:id/deposit', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('super_admin', 'order_admin'), (0, catchAsync_1.catchAsync)(order_controller_1.updateDepositHandler));
exports.default = router;
