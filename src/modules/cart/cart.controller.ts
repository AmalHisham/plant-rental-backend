import { Response } from 'express';
import Joi from 'joi';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { getCart, addItem, updateItem, removeItem, clearCart } from './cart.service';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const addItemSchema = Joi.object({
  plantId: Joi.string().length(24).required(), // MongoDB ObjectId is always 24 hex chars
  quantity: Joi.number().integer().min(1).required(),
  rentalStartDate: Joi.date().min('now').required(),
  // Joi.ref('rentalStartDate') cross-validates against the sibling field so the range is always valid.
  rentalEndDate: Joi.date().greater(Joi.ref('rentalStartDate')).required(),
}).required();

// Update schema allows any subset of the three mutable fields.
// Final date range validity (start < end after merge) is checked in the service, not here,
// because the service needs to read the current values from the DB to do the merge.
const updateItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1),
  rentalStartDate: Joi.date().min('now'),
  rentalEndDate: Joi.date().min('now'),
})
  .min(1) // reject empty update body
  .required();

const plantIdParamsSchema = Joi.object({
  plantId: Joi.string().required(),
}).required();

// ─── Handlers ────────────────────────────────────────────────────────────────

export const getCartHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const cart = await getCart(req.user!.id);
  res.status(200).json({ success: true, data: { cart } });
};

export const addItemHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = addItemSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const cart = await addItem(req.user!.id, value);
  res.status(200).json({ success: true, data: { cart } });
};

export const updateItemHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  // Validate params and body separately for precise error messages.
  const { error: paramsError, value: params } = plantIdParamsSchema.validate(req.params);
  if (paramsError) {
    res.status(400).json({ success: false, message: paramsError.details[0].message });
    return;
  }
  const { error, value } = updateItemSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const cart = await updateItem(req.user!.id, params.plantId, value);
  res.status(200).json({ success: true, data: { cart } });
};

export const removeItemHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = plantIdParamsSchema.validate(req.params);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const cart = await removeItem(req.user!.id, value.plantId);
  res.status(200).json({ success: true, data: { cart } });
};

export const clearCartHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  await clearCart(req.user!.id);
  res.status(200).json({ success: true, message: 'Cart cleared' });
};
