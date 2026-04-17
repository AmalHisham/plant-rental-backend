import mongoose, { Document } from 'mongoose';
import { orderSchema } from './order.schema';

export interface IOrderPlant {
  plantId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  plants: IOrderPlant[];
  rentalStartDate: Date;
  rentalEndDate: Date;
  totalPrice: number;
  deposit: number;
  deliveryAddress: string;
  status: 'booked' | 'delivered' | 'picked';
  damageStatus: 'none' | 'minor' | 'major';
  depositRefunded: boolean;
  policyAccepted: true;
  paymentStatus: 'pending' | 'paid' | 'failed';
  razorpayOrderId: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const Order = mongoose.model<IOrder>('Order', orderSchema);
