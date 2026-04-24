import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  createRazorpayOrder,
  verifyPayment,
  updateOrderPaymentStatus,
} from './payment.service';
import { AppError } from '../../utils/AppError';
import { createPaymentOrderSchema, verifyPaymentSchema } from './payment.validation';

export const createPaymentOrderHandler = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { error, value } = createPaymentOrderSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const result = await createRazorpayOrder(value.orderId, req.user!.id);
  res.status(200).json({ success: true, data: result });
};

export const verifyPaymentHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = verifyPaymentSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }

  const isValid = verifyPayment(value.razorpayOrderId, value.razorpayPaymentId, value.signature);

  if (!isValid) {
    // Mark as failed in the DB before throwing so the record is not left in 'pending' state.
    await updateOrderPaymentStatus(value.razorpayOrderId, value.razorpayPaymentId, 'failed');
    throw new AppError('Invalid payment signature', 400);
  }

  const payment = await updateOrderPaymentStatus(
    value.razorpayOrderId,
    value.razorpayPaymentId,
    'paid'
  );
  res.status(200).json({ success: true, data: { payment } });
};
