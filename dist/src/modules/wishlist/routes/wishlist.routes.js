"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const catchAsync_1 = require("../../../utils/catchAsync");
const wishlist_controller_1 = require("../controller/wishlist.controller");
const router = (0, express_1.Router)();
// Wishlist operations are always scoped to the signed-in user.
router.use(auth_middleware_1.protect);
router.get('/', (0, catchAsync_1.catchAsync)(wishlist_controller_1.getWishlistHandler));
router.post('/:plantId', (0, catchAsync_1.catchAsync)(wishlist_controller_1.addToWishlistHandler));
router.delete('/:plantId', (0, catchAsync_1.catchAsync)(wishlist_controller_1.removeFromWishlistHandler));
exports.default = router;
