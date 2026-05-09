import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  createOrder,
  getOrdersByUser,
  getOrderById,
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
  orderParamsSchema,
  myOrdersQuerySchema,
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
  const { error, value } = myOrdersQuerySchema.validate(req.query, { convert: true });
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const result = await getOrdersByUser(req.user!.id, value.page, value.limit);
  res.status(200).json({ success: true, data: result.orders, pagination: { page: result.page, totalPages: result.totalPages, total: result.total } });
};

export const updateStatusHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error: paramsError, value: params } = orderParamsSchema.validate(req.params);
  if (paramsError) {
    res.status(400).json({ success: false, message: paramsError.details[0].message });
    return;
  }
  const { error, value } = updateStatusSchema.validate(req.body, { abortEarly: false });
  if (error) {
    res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
    return;
  }
  const order = await updateOrderStatus(params.id, value.status);
  if (!order) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }
  res.status(200).json({ success: true, data: order });
};

export const updateDamageHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error: paramsError, value: params } = orderParamsSchema.validate(req.params);
  if (paramsError) {
    res.status(400).json({ success: false, message: paramsError.details[0].message });
    return;
  }
  const { error, value } = updateDamageSchema.validate(req.body, { abortEarly: false });
  if (error) {
    res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
    return;
  }
  const order = await updateDamageStatus(params.id, value.damageStatus);
  if (!order) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }
  res.status(200).json({ success: true, data: order });
};

export const updateDepositHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error: paramsError, value: params } = orderParamsSchema.validate(req.params);
  if (paramsError) {
    res.status(400).json({ success: false, message: paramsError.details[0].message });
    return;
  }
  const { error, value } = updateDepositSchema.validate(req.body, { abortEarly: false });
  if (error) {
    res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
    return;
  }
  const order = await updateDepositRefund(params.id, value.depositRefunded);
  if (!order) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }
  res.status(200).json({ success: true, data: order });
};

export const getMyOrderByIdHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = orderParamsSchema.validate(req.params);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const order = await getOrderById(value.id);
  // Only return the order if it belongs to the authenticated user.
  if (!order || order.userId.toString() !== req.user!.id) {
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
