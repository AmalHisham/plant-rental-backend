import { Router } from 'express';
import { protect } from '../../../middlewares/auth.middleware';
import { catchAsync } from '../../../utils/catchAsync';
import {
  getWishlistHandler,
  addToWishlistHandler,
  removeFromWishlistHandler,
} from '../controller/wishlist.controller';

const router = Router();

router.use(protect);

router.get('/', catchAsync(getWishlistHandler));
router.post('/:plantId', catchAsync(addToWishlistHandler));
router.delete('/:plantId', catchAsync(removeFromWishlistHandler));

export default router;
