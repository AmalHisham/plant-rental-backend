import mongoose, { Document } from 'mongoose';
import { paymentSchema } from './payment.schema';

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId: string | null; // null until payment succeeds
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
