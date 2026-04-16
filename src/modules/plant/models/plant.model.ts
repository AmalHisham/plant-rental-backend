import mongoose, { Document } from 'mongoose';
import { plantSchema } from './plant.schema';

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
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const Plant = mongoose.model<IPlant>('Plant', plantSchema);
