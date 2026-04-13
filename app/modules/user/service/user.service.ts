import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from '../models/user.model';
import { sendPasswordResetEmail } from './email.service';

const JWT_EXPIRES_IN = '7d';
const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 hour

const signToken = (userId: string, role: string): string => {
  const secret = process.env.JWT_SECRET as string;
  return jwt.sign({ id: userId, role }, secret, { expiresIn: JWT_EXPIRES_IN });
};

// ─── Register ────────────────────────────────────────────────────────────────

export const registerUser = async (
  name: string,
  email: string,
  password: string
): Promise<{ user: Partial<IUser>; token: string }> => {
  const existing = await User.findOne({ email });
  if (existing) throw new Error('Email already in use');

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashed });

  const token = signToken(String(user._id), user.role);

  return {
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    token,
  };
};

// ─── Login ───────────────────────────────────────────────────────────────────

export const loginUser = async (
  email: string,
  password: string
): Promise<{ user: Partial<IUser>; token: string }> => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.password) throw new Error('Invalid email or password');

  if (!user.isActive) throw new Error('Account is deactivated');

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error('Invalid email or password');

  const token = signToken(String(user._id), user.role);

  return {
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    token,
  };
};

// ─── Forgot Password ─────────────────────────────────────────────────────────

export const forgotPassword = async (email: string): Promise<void> => {
  const user = await User.findOne({ email });
  // Always resolve to avoid user enumeration
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetToken = hashed;
  user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);
  await user.save();

  await sendPasswordResetEmail(email, rawToken);
};

// ─── Validate Reset Token ────────────────────────────────────────────────────

export const validateResetToken = async (token: string): Promise<IUser> => {
  const hashed = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) throw new Error('Token is invalid or has expired');
  return user;
};

// ─── Reset Password ──────────────────────────────────────────────────────────

export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<void> => {
  const user = await validateResetToken(token);

  user.password = await bcrypt.hash(newPassword, 12);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
};

// ─── Find by ID (used by auth middleware) ────────────────────────────────────

export const findUserById = async (id: string): Promise<IUser | null> => {
  return User.findById(id).select('-password -passwordResetToken -passwordResetExpires');
};
