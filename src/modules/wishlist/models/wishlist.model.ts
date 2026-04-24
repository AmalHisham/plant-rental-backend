import mongoose, { Document } from 'mongoose';
import { wishlistSchema } from './wishlist.schema';

export interface IWishlist extends Document {
  userId: mongoose.Types.ObjectId;
  // plants is an array of sub-documents; after .populate(), each plantId is a full plant object.
  plants: { plantId: mongoose.Types.ObjectId }[];
  createdAt: Date;
  updatedAt: Date;
}

export const Wishlist = mongoose.model<IWishlist>('Wishlist', wishlistSchema);
