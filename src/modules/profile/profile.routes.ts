import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware';
import { catchAsync } from '../../utils/catchAsync';
import {
  getProfileHandler,
  updateProfileHandler,
  changePasswordHandler,
  acceptPolicyHandler,
  getAddressesHandler,
  addAddressHandler,
  updateAddressHandler,
  deleteAddressHandler,
  setDefaultAddressHandler,
} from './profile.controller';

const router = Router();

// All profile routes require authentication.
router.use(protect);

// ─── Profile info ─────────────────────────────────────────────────────────────
router.get('/', catchAsync(getProfileHandler));
router.patch('/', catchAsync(updateProfileHandler));
router.patch('/change-password', catchAsync(changePasswordHandler));
router.patch('/accept-policy', catchAsync(acceptPolicyHandler));

// ─── Addresses ────────────────────────────────────────────────────────────────
// IMPORTANT: /addresses/:id/default must be declared BEFORE /addresses/:id
// so Express does not capture the literal string "default" as the :id param.
router.get('/addresses', catchAsync(getAddressesHandler));
router.post('/addresses', catchAsync(addAddressHandler));
router.patch('/addresses/:id/default', catchAsync(setDefaultAddressHandler));
router.patch('/addresses/:id', catchAsync(updateAddressHandler));
router.delete('/addresses/:id', catchAsync(deleteAddressHandler));

export default router;
