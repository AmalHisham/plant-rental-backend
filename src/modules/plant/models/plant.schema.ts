import { Schema } from 'mongoose';

export const plantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    pricePerDay: { type: Number, required: true, min: 0 },
    depositAmount: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    careLevel: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    images: [{ type: String }],
    isAvailable: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Text index for search
plantSchema.index({ name: 'text', category: 'text', description: 'text' });
