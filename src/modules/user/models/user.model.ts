import mongoose, { Document } from 'mongoose';
import { userSchema } from './user.schema';

export type UserRole =
  | 'user'
  | 'super_admin'
  | 'product_admin'
  | 'order_admin'
  | 'delivery_admin'
  | 'user_admin';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  role: UserRole;
  isActive: boolean;
  isDeleted: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const User = mongoose.model<IUser>('User', userSchema);
