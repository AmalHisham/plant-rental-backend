import mongoose, { Document } from 'mongoose';
import { addressSchema } from './address.schema';

export interface IAddress extends Document {
  userId: mongoose.Types.ObjectId;
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const Address = mongoose.model<IAddress>('Address', addressSchema);
