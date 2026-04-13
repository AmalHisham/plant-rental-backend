import { Router } from 'express';
import {
  getPlants,
  getPlant,
  createPlantHandler,
  updatePlantHandler,
  deletePlantHandler,
} from '../controller/plant.controller';
import { protect, restrictTo } from '../../../middlewares/auth.middleware';

const router = Router();

// Public
router.get('/', getPlants);
router.get('/:id', getPlant);

// Admin only
router.post('/', protect, restrictTo('admin'), createPlantHandler);
router.put('/:id', protect, restrictTo('admin'), updatePlantHandler);
router.delete('/:id', protect, restrictTo('admin'), deletePlantHandler);

export default router;
