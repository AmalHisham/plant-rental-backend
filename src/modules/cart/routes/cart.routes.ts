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

router.use(protect);

router.get('/', catchAsync(getCartHandler));
router.post('/items', catchAsync(addItemHandler));
router.put('/items/:plantId', catchAsync(updateItemHandler));
router.delete('/items/:plantId', catchAsync(removeItemHandler));
router.delete('/', catchAsync(clearCartHandler));

export default router;
