import mongoose, { Document, Schema } from 'mongoose';

export interface IPlant extends Document {
  name: string;
  category: string;
  description: string;
  pricePerDay: number;
  depositAmount: number;
  stock: number;
  careLevel: 'easy' | 'medium' | 'hard';
  images: string[];
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const plantSchema = new Schema<IPlant>(
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
  },
  { timestamps: true }
);

// Text index for search
plantSchema.index({ name: 'text', category: 'text', description: 'text' });

export const Plant = mongoose.model<IPlant>('Plant', plantSchema);
