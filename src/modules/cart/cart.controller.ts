import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { getCart, addItem, updateItem, removeItem, clearCart } from './cart.service';
import { addItemSchema, updateItemSchema, plantIdParamsSchema } from './cart.validation';

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
