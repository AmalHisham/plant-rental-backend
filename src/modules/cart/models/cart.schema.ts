import { Schema } from 'mongoose';

export const cartSchema = new Schema(
  {
    // unique: true enforces the one-cart-per-user rule at the database index level,
    // so even if concurrent requests try to create two carts they won't both succeed.
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Each item stores its own rental window because different plants in the same cart
    // can have different rental periods (checked out as one order but tracked separately).
    items: [
      {
        plantId: { type: Schema.Types.ObjectId, ref: 'Plant', required: true },
        quantity: { type: Number, required: true, min: 1 },
        rentalStartDate: { type: Date, required: true },
        rentalEndDate: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true }
);
