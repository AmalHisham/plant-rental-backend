"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const catchAsync_1 = require("../../../utils/catchAsync");
const payment_controller_1 = require("../controller/payment.controller");
const router = (0, express_1.Router)();
// Payment routes are tied to the authenticated user and their order flow.
router.post('/create-order', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('user'), (0, catchAsync_1.catchAsync)(payment_controller_1.createPaymentOrderHandler));
router.post('/verify', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('user'), (0, catchAsync_1.catchAsync)(payment_controller_1.verifyPaymentHandler));
exports.default = router;
