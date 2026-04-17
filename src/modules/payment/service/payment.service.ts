import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Order } from '../../order/models/order.model';
import { Payment, IPayment } from '../models/payment.model';
import { AppError } from '../../../utils/AppError';

const getRazorpay = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID as string,
    key_secret: process.env.RAZORPAY_KEY_SECRET as string,
  });

export const createRazorpayOrder = async (
  orderId: string,
  userId: string
): Promise<{ razorpayOrderId: string; amount: number; currency: string; paymentId: string }> => {
  const order = await Order.findOne({ _id: orderId, isDeleted: false });
  if (!order) throw new AppError('Order not found', 404);

  const razorpay = getRazorpay();
  const rzpOrder = await razorpay.orders.create({
    amount: Math.round(order.totalPrice * 100), // paise
    currency: 'INR',
    receipt: orderId,
  });

  const payment = await Payment.create({
    orderId: new mongoose.Types.ObjectId(orderId),
    userId: new mongoose.Types.ObjectId(userId),
    razorpayOrderId: rzpOrder.id,
    amount: order.totalPrice,
    currency: 'INR',
    status: 'pending',
  });

  await Order.findByIdAndUpdate(orderId, { razorpayOrderId: rzpOrder.id });

  return {
    razorpayOrderId: rzpOrder.id,
    amount: order.totalPrice,
    currency: 'INR',
    paymentId: (payment._id as mongoose.Types.ObjectId).toString(),
  };
};

export const verifyPayment = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
    .update(body)
    .digest('hex');
  return expected === signature;
};

export const updateOrderPaymentStatus = async (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  status: 'paid' | 'failed'
): Promise<IPayment | null> => {
  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId },
    { razorpayPaymentId, status },
    { returnDocument: 'after' }
  );

  if (payment) {
    await Order.findByIdAndUpdate(payment.orderId, { paymentStatus: status });
  }

  return payment;
};
