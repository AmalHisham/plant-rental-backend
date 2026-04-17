import { Schema } from 'mongoose';

export const cartSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
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
