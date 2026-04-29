import { Router } from 'express';
import { protect, authorizeRoles } from '../../middlewares/auth.middleware';
import { catchAsync } from '../../utils/catchAsync';
import {
  getWishlistHandler,
  addToWishlistHandler,
  removeFromWishlistHandler,
} from './wishlist.controller';

const router = Router();

// Wishlist is a customer-only feature — admin roles should not have wishlists.
router.use(protect, authorizeRoles('user'));

router.get('/', catchAsync(getWishlistHandler));
// POST /:plantId  — add plant to wishlist; plantId in path (not body) keeps the API RESTful
router.post('/:plantId', catchAsync(addToWishlistHandler));
router.delete('/:plantId', catchAsync(removeFromWishlistHandler));

export default router;
