import { Schema } from 'mongoose';

export const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // plants is an embedded array rather than a separate collection because the order
    // snapshot must stay immutable — changing a plant's price later shouldn't alter old orders.
    plants: [
      {
        plantId: { type: Schema.Types.ObjectId, ref: 'Plant', required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],

    rentalStartDate: { type: Date, required: true },
    rentalEndDate: { type: Date, required: true },

    // totalPrice = rentalTotal + deposit, stored as one field for payment processing.
    totalPrice: { type: Number, required: true, min: 0 },

    // deposit is stored separately so it can be tracked and conditionally refunded
    // independent of the rental cost.
    deposit: { type: Number, required: true, min: 0 },

    deliveryAddress: { type: String, required: true, trim: true },

    // status tracks the physical lifecycle of the plants.
    // booked → delivered → picked (returned).
    status: { type: String, enum: ['booked', 'delivered', 'picked'], default: 'booked' },

    // damageStatus is recorded at return time by the order admin.
    // none = full deposit refund eligible; minor/major = partial or no refund.
    damageStatus: { type: String, enum: ['none', 'minor', 'major'], default: 'none' },

    depositRefunded: { type: Boolean, default: false },

    // policyAccepted must be true before an order can be created — enforced at both
    // the Joi layer (valid(true)) and stored here for audit purposes.
    policyAccepted: { type: Boolean, required: true },

    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },

    // razorpayOrderId is populated when the Razorpay order is created, and checked again
    // during payment verification to prevent cross-order payment tampering.
    razorpayOrderId: { type: String, default: null },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);
