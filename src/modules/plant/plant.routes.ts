import { Router } from 'express';
import {
  getPlants,
  getPlant,
  createPlantHandler,
  updatePlantHandler,
  deletePlantHandler,
  uploadImagesHandler,
  deleteImageHandler,
} from './plant.controller';
import { protect, authorizeRoles } from '../../middlewares/auth.middleware';
import { upload } from '../../middlewares/upload.middleware';
import { catchAsync } from '../../utils/catchAsync';

const router = Router();

// GET endpoints are public — anyone can browse and view plants without authentication.
// This keeps the homepage fast and crawler-friendly.
router.get('/', catchAsync(getPlants));
router.get('/:id', catchAsync(getPlant));

// Mutations require a valid JWT (protect) AND the product_admin or super_admin role.
// super_admin is included on every restricted route by convention — it bypasses all role checks.
router.post('/', protect, authorizeRoles('super_admin', 'product_admin'), catchAsync(createPlantHandler));
router.put('/:id', protect, authorizeRoles('super_admin', 'product_admin'), catchAsync(updatePlantHandler));
router.delete('/:id', protect, authorizeRoles('super_admin', 'product_admin'), catchAsync(deletePlantHandler));

// upload.array('images', 5) accepts up to 5 files under the field name "images".
// multer runs before catchAsync so file validation errors surface as 400s via AppError.
router.post('/:id/images', protect, authorizeRoles('super_admin', 'product_admin'), upload.array('images', 5), catchAsync(uploadImagesHandler));
router.delete('/:id/images', protect, authorizeRoles('super_admin', 'product_admin'), catchAsync(deleteImageHandler));

export default router;
