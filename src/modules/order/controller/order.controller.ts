import { Response } from 'express';
import Joi from 'joi';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import {
  createOrder,
  getOrdersByUser,
  updateOrderStatus,
  updateDamageStatus,
  updateDepositRefund,
  checkoutFromCart,
} from '../service/order.service';

const createOrderSchema = Joi.object({
  plants: Joi.array()
    .items(
      Joi.object({
        plantId: Joi.string().length(24).required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
  rentalStartDate: Joi.date().min('now').required(),
  rentalEndDate: Joi.date().greater(Joi.ref('rentalStartDate')).required(),
  deliveryAddress: Joi.string().trim().min(5).required(),
  policyAccepted: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must accept the policies before placing an order',
  }),
}).required();

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('booked', 'delivered', 'picked').required(),
}).required();

const updateDamageSchema = Joi.object({
  damageStatus: Joi.string().valid('none', 'minor', 'major').required(),
}).required();

const updateDepositSchema = Joi.object({
  depositRefunded: Joi.boolean().required(),
}).required();

export const createOrderHandler = async (req: AuthRequest, res: Response): Promise<void> => {
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

const checkoutSchema = Joi.object({
  deliveryAddress: Joi.string().trim().min(5).required(),
  policyAccepted: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must accept the policies before placing an order',
  }),
}).required();

export const checkoutHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = checkoutSchema.validate(req.body, { abortEarly: false });
  if (error) {
    res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
    return;
  }

  const order = await checkoutFromCart(req.user!.id, value.deliveryAddress, value.policyAccepted);
  res.status(201).json({ success: true, data: order });
};
