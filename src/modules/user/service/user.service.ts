// User service — all business logic for authentication and user management lives here.
// Controllers call these functions and only handle input validation + HTTP response formatting.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from '../models/user.model';
import { sendPasswordResetEmail } from './email.service';
import { AppError } from '../../../utils/AppError';

const ACCESS_TOKEN_EXPIRES_IN = '15m';  // short-lived; forces regular refresh
const REFRESH_TOKEN_EXPIRES_IN = '15d'; // long-lived; stored in DB so it can be revoked
const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 hour window for password reset

// Access tokens carry id + role so protect() and authorizeRoles() don't need a DB call
// on every request — the role is trusted from the token until it expires.
const signAccessToken = (userId: string, role: string): string => {
  const secret = process.env.JWT_SECRET as string;
  return jwt.sign({ id: userId, role }, secret, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

// Refresh tokens carry only the id — role changes take effect on the next full login.
// Signed with a DIFFERENT secret so a compromised JWT_SECRET can't forge refresh tokens.
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
  // Check for duplicates before hashing (bcrypt.hash is CPU-expensive — cost factor 12).
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already in use', 409);

  // Cost factor 12 means 2^12 = 4096 bcrypt iterations — slow enough to resist brute force,
  // fast enough for normal usage (< 300ms on modern hardware).
  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashed });

  // Issue both tokens immediately so the client is logged in right after registration.
  const accessToken = signAccessToken(String(user._id), user.role);
  const refreshToken = signRefreshToken(String(user._id));

  // Persist the refresh token to DB — this is the server's record of the active session.
  user.refreshToken = refreshToken;
  await user.save();

  // Return only the safe subset of fields — never return the hashed password.
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
  // .select('+password') is required because password is normally excluded from query results
  // to prevent accidental exposure in responses. We need it here to run bcrypt.compare().
  const user = await User.findOne({ email, isDeleted: false }).select('+password');
  if (!user || !user.password) throw new AppError('Invalid email or password', 401);

  if (!user.isActive) throw new AppError('Account is deactivated', 401);

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new AppError('Invalid email or password', 401);

  const accessToken = signAccessToken(String(user._id), user.role);
  const refreshToken = signRefreshToken(String(user._id));

  // Replacing the old refresh token invalidates any existing sessions on other devices.
  // This is a single-session model — only the last device to log in can use the refresh token.
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
  // Return silently for unknown emails — user enumeration would let attackers
  // discover which emails are registered by observing different error responses.
  if (!user) return;

  // crypto.randomBytes(32) generates a 256-bit cryptographically secure random token.
  const rawToken = crypto.randomBytes(32).toString('hex');
  // Store only the SHA-256 hash in the DB. Even if the DB is breached, the attacker
  // can't reconstruct the raw token needed to trigger a password reset.
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetToken = hashed;
  user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);
  await user.save();

  // The raw (unhashed) token is embedded in the reset link sent to the user's email.
  await sendPasswordResetEmail(email, rawToken);
};

// ─── Validate Reset Token ────────────────────────────────────────────────────

export const validateResetToken = async (token: string): Promise<IUser> => {
  // Re-hash the incoming token to compare against the stored digest.
  const hashed = crypto.createHash('sha256').update(token).digest('hex');

  // $gt: new Date() rejects tokens where the expiry timestamp has passed.
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

  const hashed = await bcrypt.hash(newPassword, 12);

  // $unset removes the reset token fields entirely from the document,
  // ensuring the same reset link cannot be used a second time.
  await User.findByIdAndUpdate(
    user._id,
    {
      $set: { password: hashed },
      $unset: { passwordResetToken: '', passwordResetExpires: '' },
    },
    { returnDocument: 'after' } // Mongoose 8+: use returnDocument over deprecated { new: true }
  );
};

// ─── Refresh Access Token ─────────────────────────────────────────────────────

export const refreshAccessToken = async (token: string): Promise<{ accessToken: string }> => {
  let decoded: { id: string };
  try {
    // Verified with JWT_REFRESH_SECRET — a different key from the access token secret.
    // This prevents a compromised access token from being used to forge a refresh token.
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as { id: string };
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.findOne({ _id: decoded.id, isDeleted: false });
  if (!user || !user.isActive) throw new AppError('User no longer exists or is inactive', 401);

  // Token rotation guard: the presented token must exactly match what the server last stored.
  // If they differ, it means the user logged in elsewhere and this is a stale token.
  if (user.refreshToken !== token) throw new AppError('Refresh token mismatch. Please log in again', 401);

  const accessToken = signAccessToken(String(user._id), user.role);
  return { accessToken };
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logoutUser = async (userId: string): Promise<void> => {
  // Setting refreshToken to null means the stored token no longer matches any future
  // refresh attempt, effectively ending the session server-side.
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

// ─── Find by ID (used by auth middleware) ────────────────────────────────────

export const findUserById = async (id: string): Promise<IUser | null> => {
  // Called on every protected request to verify the token holder still exists and is active.
  // Sensitive fields are excluded to avoid accidentally sending them downstream.
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

  // Build the query object dynamically — only add fields that were actually provided
  // so omitting a filter doesn't add a spurious undefined condition to the Mongo query.
  const query: Record<string, unknown> = { isDeleted };
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive;
  if (search) {
    // Case-insensitive regex search across both name and email fields simultaneously.
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  // Promise.all runs count + find in parallel — avoids two sequential round-trips to MongoDB.
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
  // returnDocument: 'after' returns the document as it looks after the update,
  // so the caller sees the new isActive value without a second query.
  const user = await User.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isActive },
    { returnDocument: 'after' }
  ).select('-password -passwordResetToken -passwordResetExpires -refreshToken');
  if (!user) throw new AppError('User not found', 404);
  return user;
};

// ─── Soft Delete User ─────────────────────────────────────────────────────────

export const softDeleteUser = async (id: string): Promise<void> => {
  // Clear refreshToken alongside isDeleted so any active session is immediately invalidated —
  // the protect middleware will reject the user on the next request.
  const user = await User.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, refreshToken: null }
  );
  if (!user) throw new AppError('User not found', 404);
};

// ─── Find or Create Google User ───────────────────────────────────────────────

export const findOrCreateGoogleUser = async (
  googleId: string,
  email: string,
  name: string
): Promise<{ user: Partial<IUser>; accessToken: string; refreshToken: string }> => {
  // Priority order:
  // 1. Find by googleId — returning user who has signed in with Google before.
  // 2. Find by email — existing email/password user; link their Google ID to the account.
  // 3. Create a new account with the Google profile data.
  let user = await User.findOne({ googleId, isDeleted: false });

  if (!user) {
    user = await User.findOne({ email, isDeleted: false });
    if (user) {
      // Merge Google ID into the existing account so future Google logins go to path 1.
      user.googleId = googleId;
      await user.save();
    }
  }

  if (!user) {
    // New user — no password field because they authenticate via Google, not a password.
    user = await User.create({ name, email, googleId });
  }

  if (!user.isActive) throw new AppError('Account is deactivated', 401);

  // Identical token issuance to email/password login — same JWT shape, same expiry rules.
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
