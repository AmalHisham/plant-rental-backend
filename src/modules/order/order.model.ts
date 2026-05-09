import mongoose, { Document } from 'mongoose';
import { orderSchema } from './order.schema';

// IOrderPlant is the embedded sub-document type for each line item in an order.
export interface IOrderPlant {
  plantId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  plants: IOrderPlant[];
  rentalStartDate: Date;
  rentalEndDate: Date;
  totalPrice: number;    // rentalTotal + deposit
  deposit: number;       // held amount, tracked separately for refund logic
  deliveryAddress: string;
  status: 'booked' | 'delivered' | 'picked';
  damageStatus: 'none' | 'minor' | 'major';
  depositRefunded: boolean;
  policyAccepted: true;  // literal true (not boolean) — the user can only ever accept, not reject
  paymentStatus: 'pending' | 'paid' | 'failed';
  razorpayOrderId: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const Order = mongoose.model<IOrder>('Order', orderSchema);
