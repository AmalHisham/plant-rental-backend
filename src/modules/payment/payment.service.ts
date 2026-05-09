import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Order } from '../order/order.model';
import { Plant } from '../plant/plant.model';
import { Payment, IPayment } from './payment.model';
import { AppError } from '../../utils/AppError';

// getRazorpay() is a factory function rather than a module-level singleton so that
// env vars are read at call time (after dotenv has run), not at module import time.
const getRazorpay = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID as string,
    key_secret: process.env.RAZORPAY_KEY_SECRET as string,
  });

// ─── Create Razorpay Order ────────────────────────────────────────────────────
// Creates a Razorpay order object that the frontend checkout widget uses to initiate payment.
// Returns the Razorpay order ID, amount, and our internal payment document ID.

export const createRazorpayOrder = async (
  orderId: string,
  userId: string
): Promise<{ razorpayOrderId: string; amount: number; currency: string; paymentId: string }> => {
  const order = await Order.findOne({ _id: orderId, isDeleted: false });
  if (!order) throw new AppError('Order not found', 404);

  const razorpay = getRazorpay();
  const rzpOrder = await razorpay.orders.create({
    // Razorpay expects amounts in the smallest currency unit (paise for INR).
    // Math.round avoids floating-point precision issues when multiplying by 100.
    amount: Math.round(order.totalPrice * 100),
    currency: 'INR',
    receipt: orderId, // linked back to our internal order ID for reconciliation
  });

  // Create an internal payment record to track the Razorpay order lifecycle.
  const payment = await Payment.create({
    orderId: new mongoose.Types.ObjectId(orderId),
    userId: new mongoose.Types.ObjectId(userId),
    razorpayOrderId: rzpOrder.id,
    amount: order.totalPrice,
    currency: 'INR',
    status: 'pending',
  });

  // Also store the Razorpay order ID on the internal order document so that
  // verifyPayment can look up the order without querying the Payment collection.
  await Order.findByIdAndUpdate(orderId, { razorpayOrderId: rzpOrder.id });

  return {
    razorpayOrderId: rzpOrder.id,
    amount: order.totalPrice,
    currency: 'INR',
    paymentId: (payment._id as mongoose.Types.ObjectId).toString(),
  };
};

// ─── Verify Payment Signature ─────────────────────────────────────────────────
// Razorpay sends a signature with its payment callback. We recompute it using the
// shared key_secret and compare — this proves the callback came from Razorpay, not
// a spoofed request. If signatures don't match, the payment should be rejected.

export const verifyPayment = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean => {
  // The expected signature is HMAC-SHA256 of "orderId|paymentId" using the key_secret.
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
    .update(body)
    .digest('hex');
  return expected === signature;
};

// ─── Update Order Payment Status ──────────────────────────────────────────────
// Called after signature verification — marks both the Payment and Order documents.
// On failure, the reserved stock is released back into inventory so the plants
// can be booked by other users.

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
    // Keep the Order's paymentStatus field in sync with the Payment record.
    await Order.findByIdAndUpdate(payment.orderId, { paymentStatus: status });

    if (status === 'failed') {
      // Stock was decremented when the order was created. Roll it back on payment failure
      // so the inventory reflects the actual available quantity.
      const order = await Order.findById(payment.orderId);
      if (order) {
        for (const item of order.plants) {
          await Plant.findByIdAndUpdate(item.plantId, { $inc: { stock: item.quantity } });
        }
      }
    }
  }

  return payment;
};
