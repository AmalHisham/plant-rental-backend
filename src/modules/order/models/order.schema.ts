import { Schema } from 'mongoose';

export const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plants: [
      {
        plantId: { type: Schema.Types.ObjectId, ref: 'Plant', required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    rentalStartDate: { type: Date, required: true },
    rentalEndDate: { type: Date, required: true },
    totalPrice: { type: Number, required: true, min: 0 },
    deposit: { type: Number, required: true, min: 0 },
    deliveryAddress: { type: String, required: true, trim: true },
    status: { type: String, enum: ['booked', 'delivered', 'picked'], default: 'booked' },
    damageStatus: { type: String, enum: ['none', 'minor', 'major'], default: 'none' },
    depositRefunded: { type: Boolean, default: false },
    policyAccepted: { type: Boolean, required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    razorpayOrderId: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);
