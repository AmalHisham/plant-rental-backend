import mongoose, { Document } from 'mongoose';
import { cartSchema } from './cart.schema';

// ICartItem types the embedded sub-document for each line item in the cart.
export interface ICartItem {
  plantId: mongoose.Types.ObjectId;
  quantity: number;
  rentalStartDate: Date;
  rentalEndDate: Date;
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export const Cart = mongoose.model<ICart>('Cart', cartSchema);
