import bcrypt from 'bcryptjs';
import { User, IUser } from '../user/user.model';
import { Address, IAddress } from './address.model';
import { AppError } from '../../utils/AppError';

// Fields excluded from all profile responses — never expose to the client.
const SAFE_USER_FIELDS = '-password -passwordResetToken -passwordResetExpires -refreshToken';

// ─── Get own profile ──────────────────────────────────────────────────────────

export const getProfile = async (userId: string): Promise<IUser> => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).select(SAFE_USER_FIELDS);
  if (!user) throw new AppError('User not found', 404);
  return user;
};

// ─── Update profile (name and/or phone) ──────────────────────────────────────

export const updateProfile = async (
  userId: string,
  data: { name?: string; phone?: string }
): Promise<IUser> => {
  const user = await User.findOneAndUpdate(
    { _id: userId, isDeleted: false },
    data,
    { returnDocument: 'after' }
  ).select(SAFE_USER_FIELDS);
  if (!user) throw new AppError('User not found', 404);
  return user;
};

// ─── Change password ──────────────────────────────────────────────────────────

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  // Select password explicitly — it is not included in default queries.
  const user = await User.findOne({ _id: userId, isDeleted: false }).select('+password');
  if (!user) throw new AppError('User not found', 404);

  // Guard: Google-only accounts have no password field.
  if (!user.password) {
    throw new AppError('Password change is not available for accounts signed in with Google', 400);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new AppError('Current password is incorrect', 401);

  const hashed = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(userId, { password: hashed });
};

// ─── Accept policy ────────────────────────────────────────────────────────────

export const acceptPolicy = async (userId: string): Promise<void> => {
  // Idempotent — safe to call even if already accepted.
  await User.findByIdAndUpdate(userId, { policyAccepted: true });
};

// ─── Get own addresses (non-deleted) ─────────────────────────────────────────

export const getAddresses = async (userId: string): Promise<IAddress[]> => {
  // Sort: default address first, then newest first.
  return Address.find({ userId, isDeleted: false }).sort({ isDefault: -1, createdAt: -1 });
};

// ─── Set address as default (atomic two-step) ─────────────────────────────────
// Step 1: clear all defaults for this user.
// Step 2: set the target. Between steps, all isDefault=false which is a safe intermediate state.

export const setAddressAsDefault = async (
  userId: string,
  addressId: string
): Promise<IAddress> => {
  const exists = await Address.findOne({ _id: addressId, userId, isDeleted: false });
  if (!exists) throw new AppError('Address not found', 404);

  await Address.updateMany({ userId, isDeleted: false }, { isDefault: false });

  const updated = await Address.findOneAndUpdate(
    { _id: addressId, userId, isDeleted: false },
    { isDefault: true },
    { returnDocument: 'after' }
  );

  if (!updated) throw new AppError('Address not found', 404);
  return updated;
};

// ─── Add address ──────────────────────────────────────────────────────────────

export const addAddress = async (
  userId: string,
  data: {
    label: string;
    recipientName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
  }
): Promise<IAddress> => {
  const existingCount = await Address.countDocuments({ userId, isDeleted: false });
  // First address is always default; otherwise honour the isDefault flag from the request.
  const shouldBeDefault = data.isDefault || existingCount === 0;

  const address = await Address.create({ ...data, userId, isDefault: false });

  if (shouldBeDefault) {
    return setAddressAsDefault(userId, String(address._id));
  }

  return address;
};

// ─── Update address fields ────────────────────────────────────────────────────

export const updateAddress = async (
  userId: string,
  addressId: string,
  data: Partial<Omit<IAddress, 'userId' | 'isDefault' | 'isDeleted' | 'createdAt' | 'updatedAt'>>
): Promise<IAddress> => {
  const address = await Address.findOneAndUpdate(
    { _id: addressId, userId, isDeleted: false },
    data,
    { returnDocument: 'after' }
  );
  if (!address) throw new AppError('Address not found', 404);
  return address;
};

// ─── Soft delete address ──────────────────────────────────────────────────────

export const deleteAddress = async (userId: string, addressId: string): Promise<void> => {
  const address = await Address.findOne({ _id: addressId, userId, isDeleted: false });
  if (!address) throw new AppError('Address not found', 404);

  await Address.findByIdAndUpdate(addressId, { isDeleted: true });

  // Auto-promote: if the deleted address was the default, make the next one default.
  if (address.isDefault) {
    const next = await Address.findOne(
      { userId, isDeleted: false },
      {},
      { sort: { createdAt: -1 } }
    );
    if (next) {
      await Address.updateMany({ userId, isDeleted: false }, { isDefault: false });
      await Address.findByIdAndUpdate(next._id, { isDefault: true });
    }
  }
};
