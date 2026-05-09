import { Schema } from 'mongoose';

export const wishlistSchema = new Schema(
  {
    // unique: true enforces the one-wishlist-per-user rule at the DB level,
    // consistent with the cart model design.
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Each entry holds only a plantId reference — no quantity or rental dates —
    // because a wishlist is a "save for later" list, not an order.
    plants: [
      {
        plantId: { type: Schema.Types.ObjectId, ref: 'Plant', required: true },
      },
    ],
  },
  { timestamps: true }
);
