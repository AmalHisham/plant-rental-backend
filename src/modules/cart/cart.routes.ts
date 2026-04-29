import { Router } from 'express';
import { protect, authorizeRoles } from '../../middlewares/auth.middleware';
import { catchAsync } from '../../utils/catchAsync';
import {
  getCartHandler,
  addItemHandler,
  updateItemHandler,
  removeItemHandler,
  clearCartHandler,
} from './cart.controller';

const router = Router();

// Cart is a customer-only feature — admin roles have no business adding plants to a cart.
router.use(protect, authorizeRoles('user'));

router.get('/', catchAsync(getCartHandler));
router.post('/items', catchAsync(addItemHandler));
router.put('/items/:plantId', catchAsync(updateItemHandler));    // update quantity/dates for one item
router.delete('/items/:plantId', catchAsync(removeItemHandler)); // remove one item
router.delete('/', catchAsync(clearCartHandler));                // wipe all items

export default router;
