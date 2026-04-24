import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware';
import { catchAsync } from '../../utils/catchAsync';
import {
  getWishlistHandler,
  addToWishlistHandler,
  removeFromWishlistHandler,
} from './wishlist.controller';

const router = Router();

// All wishlist operations are user-scoped and require authentication.
router.use(protect);

router.get('/', catchAsync(getWishlistHandler));
// POST /:plantId  — add plant to wishlist; plantId in path (not body) keeps the API RESTful
router.post('/:plantId', catchAsync(addToWishlistHandler));
router.delete('/:plantId', catchAsync(removeFromWishlistHandler));

export default router;
