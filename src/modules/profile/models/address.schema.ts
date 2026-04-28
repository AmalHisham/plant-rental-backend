import { Schema } from 'mongoose';

export const addressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, required: true, trim: true },
    recipientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    // pincode stored as String, not Number — preserves leading zeros and avoids type coercion.
    pincode: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
    // isDeleted supports soft delete consistent with the rest of the codebase.
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);
