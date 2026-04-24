import mongoose, { Document } from 'mongoose';
import { userSchema } from './user.schema';

// UserRole is a union type mirroring the enum in user.schema.ts.
// Keeping it here (not in schema.ts) makes it importable by other modules
// (e.g. auth middleware, admin service) without importing the Mongoose schema.
export type UserRole =
  | 'user'
  | 'super_admin'
  | 'product_admin'
  | 'order_admin'
  | 'delivery_admin'
  | 'user_admin';

// IUser extends Document so Mongoose methods (_id, save(), etc.) are typed.
// Optional fields (?) match schema fields that are not required — password, googleId,
// reset token fields, and refreshToken can all be undefined/null at various points.
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

// mongoose.model<IUser>() binds the schema to the 'User' collection and types all
// query results as IUser. This is the single export used across all modules.
export const User = mongoose.model<IUser>('User', userSchema);
