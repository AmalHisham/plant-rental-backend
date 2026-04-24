"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const plant_controller_1 = require("../controller/plant.controller");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const catchAsync_1 = require("../../../utils/catchAsync");
const router = (0, express_1.Router)();
// Public
// Read endpoints stay open, while mutations are restricted to product admins.
router.get('/', (0, catchAsync_1.catchAsync)(plant_controller_1.getPlants));
router.get('/:id', (0, catchAsync_1.catchAsync)(plant_controller_1.getPlant));
// Product admins only
router.post('/', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('super_admin', 'product_admin'), (0, catchAsync_1.catchAsync)(plant_controller_1.createPlantHandler));
router.put('/:id', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('super_admin', 'product_admin'), (0, catchAsync_1.catchAsync)(plant_controller_1.updatePlantHandler));
router.delete('/:id', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('super_admin', 'product_admin'), (0, catchAsync_1.catchAsync)(plant_controller_1.deletePlantHandler));
exports.default = router;
