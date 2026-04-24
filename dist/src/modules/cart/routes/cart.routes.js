"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const catchAsync_1 = require("../../../utils/catchAsync");
const cart_controller_1 = require("../controller/cart.controller");
const router = (0, express_1.Router)();
// Every cart route is protected because carts are user-specific.
router.use(auth_middleware_1.protect);
router.get('/', (0, catchAsync_1.catchAsync)(cart_controller_1.getCartHandler));
router.post('/items', (0, catchAsync_1.catchAsync)(cart_controller_1.addItemHandler));
router.put('/items/:plantId', (0, catchAsync_1.catchAsync)(cart_controller_1.updateItemHandler));
router.delete('/items/:plantId', (0, catchAsync_1.catchAsync)(cart_controller_1.removeItemHandler));
router.delete('/', (0, catchAsync_1.catchAsync)(cart_controller_1.clearCartHandler));
exports.default = router;
