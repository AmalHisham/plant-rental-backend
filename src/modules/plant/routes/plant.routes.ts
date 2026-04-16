import { Router } from 'express';
import {
  getPlants,
  getPlant,
  createPlantHandler,
  updatePlantHandler,
  deletePlantHandler,
} from '../controller/plant.controller';
import { protect, authorizeRoles } from '../../../middlewares/auth.middleware';
import { catchAsync } from '../../../utils/catchAsync';

const router = Router();

// Public
router.get('/', catchAsync(getPlants));
router.get('/:id', catchAsync(getPlant));

// Product admins only
router.post('/', protect, authorizeRoles('super_admin', 'product_admin'), catchAsync(createPlantHandler));
router.put('/:id', protect, authorizeRoles('super_admin', 'product_admin'), catchAsync(updatePlantHandler));
router.delete('/:id', protect, authorizeRoles('super_admin', 'product_admin'), catchAsync(deletePlantHandler));

export default router;
