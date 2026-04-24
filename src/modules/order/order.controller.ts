import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  createOrder,
  getOrdersByUser,
  updateOrderStatus,
  updateDamageStatus,
  updateDepositRefund,
  checkoutFromCart,
} from './order.service';
import {
  createOrderSchema,
  updateStatusSchema,
  updateDamageSchema,
  updateDepositSchema,
  checkoutSchema,
} from './order.validation';

// ─── Handlers ────────────────────────────────────────────────────────────────

export const createOrderHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  // abortEarly: false collects all validation errors in one response instead of stopping at first.
  const { error, value } = createOrderSchema.validate(req.body, { abortEarly: false });
  if (error) {
    res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
    return;
  }
  const order = await createOrder({ userId: req.user!.id, ...value });
  res.status(201).json({ success: true, data: order });
};

export const getMyOrdersHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const orders = await getOrdersByUser(req.user!.id);
  res.status(200).json({ success: true, data: orders });
};

export const updateStatusHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = updateStatusSchema.validate(req.body, { abortEarly: false });
  if (error) {
    res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
    return;
  }
  const order = await updateOrderStatus(req.params.id as string, value.status);
  if (!order) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }
  res.status(200).json({ success: true, data: order });
};

export const updateDamageHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = updateDamageSchema.validate(req.body, { abortEarly: false });
  if (error) {
    res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
    return;
  }
  const order = await updateDamageStatus(req.params.id as string, value.damageStatus);
  if (!order) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }
  res.status(200).json({ success: true, data: order });
};

export const updateDepositHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = updateDepositSchema.validate(req.body, { abortEarly: false });
  if (error) {
    res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
    return;
  }
  const order = await updateDepositRefund(req.params.id as string, value.depositRefunded);
  if (!order) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }
  res.status(200).json({ success: true, data: order });
};

export const checkoutHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = checkoutSchema.validate(req.body, { abortEarly: false });
  if (error) {
    res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
    return;
  }
  const order = await checkoutFromCart(req.user!.id, value.deliveryAddress, value.policyAccepted);
  res.status(201).json({ success: true, data: order });
};
