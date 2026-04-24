import { Schema } from 'mongoose';

export const paymentSchema = new Schema(
  {
    // orderId links this payment record to the internal order it covers.
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // razorpayOrderId is the ID returned by Razorpay's order creation API.
    // It is also stored on the Order document for cross-referencing during verification.
    razorpayOrderId: { type: String, required: true },

    // razorpayPaymentId is populated only after a successful payment — null while pending.
    razorpayPaymentId: { type: String, default: null },

    // Amount stored in rupees (not paise) for readability; converted to paise when
    // calling razorpay.orders.create() in the service.
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },

    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  },
  { timestamps: true }
);
