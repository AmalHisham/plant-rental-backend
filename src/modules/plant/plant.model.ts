import mongoose, { Document } from 'mongoose';
import { plantSchema } from './plant.schema';

export interface IPlantImage {
  thumb: string;
  medium: string;
  original: string;
}

// IPlant provides TypeScript types for all plant documents returned by Mongoose queries.
// Extending Document gives access to _id, save(), and other Mongoose document methods.
export interface IPlant extends Document {
  name: string;
  category: string;
  description: string;
  pricePerDay: number;
  depositAmount: number;
  stock: number;
  careLevel: 'easy' | 'medium' | 'hard'; // union type mirrors the schema enum
  images: IPlantImage[];
  isAvailable: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const Plant = mongoose.model<IPlant>('Plant', plantSchema);
