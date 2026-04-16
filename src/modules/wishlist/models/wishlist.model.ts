import mongoose, { Document } from 'mongoose';
import { wishlistSchema } from './wishlist.schema';

export interface IWishlist extends Document {
  userId: mongoose.Types.ObjectId;
  plants: { plantId: mongoose.Types.ObjectId }[];
  createdAt: Date;
  updatedAt: Date;
}

export const Wishlist = mongoose.model<IWishlist>('Wishlist', wishlistSchema);
