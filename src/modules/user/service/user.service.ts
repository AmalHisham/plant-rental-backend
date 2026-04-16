import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from '../models/user.model';
import { sendPasswordResetEmail } from './email.service';
import { AppError } from '../../../utils/AppError';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '15d';
const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 hour

const signAccessToken = (userId: string, role: string): string => {
  const secret = process.env.JWT_SECRET as string;
  return jwt.sign({ id: userId, role }, secret, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

const signRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET as string;
  return jwt.sign({ id: userId }, secret, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};

// ─── Register ────────────────────────────────────────────────────────────────

export const registerUser = async (
  name: string,
  email: string,
  password: string
): Promise<{ user: Partial<IUser>; accessToken: string; refreshToken: string }> => {
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already in use', 409);

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashed });

  const accessToken = signAccessToken(String(user._id), user.role);
  const refreshToken = signRefreshToken(String(user._id));

  user.refreshToken = refreshToken;
  await user.save();

  return {
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  };
};

// ─── Login ───────────────────────────────────────────────────────────────────

export const loginUser = async (
  email: string,
  password: string
): Promise<{ user: Partial<IUser>; accessToken: string; refreshToken: string }> => {
  const user = await User.findOne({ email, isDeleted: false }).select('+password');
  if (!user || !user.password) throw new AppError('Invalid email or password', 401);

  if (!user.isActive) throw new AppError('Account is deactivated', 401);

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new AppError('Invalid email or password', 401);

  const accessToken = signAccessToken(String(user._id), user.role);
  const refreshToken = signRefreshToken(String(user._id));

  user.refreshToken = refreshToken;
  await user.save();

  return {
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken,
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

  if (!user) throw new AppError('Token is invalid or has expired', 400);
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

// ─── Refresh Access Token ─────────────────────────────────────────────────────

export const refreshAccessToken = async (token: string): Promise<{ accessToken: string }> => {
  let decoded: { id: string };
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as { id: string };
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.findOne({ _id: decoded.id, isDeleted: false });
  if (!user || !user.isActive) throw new AppError('User no longer exists or is inactive', 401);
  if (user.refreshToken !== token) throw new AppError('Refresh token mismatch. Please log in again', 401);

  const accessToken = signAccessToken(String(user._id), user.role);
  return { accessToken };
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logoutUser = async (userId: string): Promise<void> => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

// ─── Find by ID (used by auth middleware) ────────────────────────────────────

export const findUserById = async (id: string): Promise<IUser | null> => {
  return User.findOne({ _id: id, isDeleted: false }).select('-password -passwordResetToken -passwordResetExpires');
};

// ─── Get All Users ────────────────────────────────────────────────────────────

export const getAllUsers = async (filters: {
  role?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ users: Partial<IUser>[]; total: number; page: number; totalPages: number }> => {
  const { role, isActive, isDeleted = false, search, page = 1, limit = 10 } = filters;

  const query: Record<string, unknown> = { isDeleted };
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password -passwordResetToken -passwordResetExpires -refreshToken')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    User.countDocuments(query),
  ]);

  return { users, total, page, totalPages: Math.ceil(total / limit) };
};

// ─── Get User By ID ───────────────────────────────────────────────────────────

export const getUserById = async (id: string): Promise<IUser> => {
  const user = await User.findOne({ _id: id, isDeleted: false }).select(
    '-password -passwordResetToken -passwordResetExpires -refreshToken'
  );
  if (!user) throw new AppError('User not found', 404);
  return user;
};

// ─── Update User Status ───────────────────────────────────────────────────────

export const updateUserStatus = async (id: string, isActive: boolean): Promise<IUser> => {
  const user = await User.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isActive },
    { new: true }
  ).select('-password -passwordResetToken -passwordResetExpires -refreshToken');
  if (!user) throw new AppError('User not found', 404);
  return user;
};

// ─── Soft Delete User ─────────────────────────────────────────────────────────

export const softDeleteUser = async (id: string): Promise<void> => {
  const user = await User.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, refreshToken: null }
  );
  if (!user) throw new AppError('User not found', 404);
};
