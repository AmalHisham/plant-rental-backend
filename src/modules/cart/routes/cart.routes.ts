import { Router } from 'express';
import { protect } from '../../../middlewares/auth.middleware';
import { catchAsync } from '../../../utils/catchAsync';
import {
  getCartHandler,
  addItemHandler,
  updateItemHandler,
  removeItemHandler,
  clearCartHandler,
} from '../controller/cart.controller';

const router = Router();

// router.use(protect) applies the auth middleware to every route in this file —
// cleaner than attaching protect to each individual route definition.
router.use(protect);

router.get('/', catchAsync(getCartHandler));
router.post('/items', catchAsync(addItemHandler));
router.put('/items/:plantId', catchAsync(updateItemHandler));    // update quantity/dates for one item
router.delete('/items/:plantId', catchAsync(removeItemHandler)); // remove one item
router.delete('/', catchAsync(clearCartHandler));                // wipe all items

export default router;
