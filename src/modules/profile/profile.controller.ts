import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  getProfile,
  updateProfile,
  changePassword,
  acceptPolicy,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setAddressAsDefault,
} from './profile.service';
import {
  updateProfileSchema,
  changePasswordSchema,
  createAddressSchema,
  updateAddressSchema,
  addressIdParamsSchema,
} from './profile.validation';

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getProfileHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await getProfile(req.user!.id);
  res.status(200).json({ success: true, data: { user } });
};

export const updateProfileHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = updateProfileSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const user = await updateProfile(req.user!.id, value);
  res.status(200).json({ success: true, data: { user } });
};

export const changePasswordHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = changePasswordSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  await changePassword(req.user!.id, value.currentPassword, value.newPassword);
  res.status(200).json({ success: true, message: 'Password changed successfully' });
};

export const acceptPolicyHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  await acceptPolicy(req.user!.id);
  res.status(200).json({ success: true, message: 'Policy accepted' });
};

// ─── Addresses ────────────────────────────────────────────────────────────────

export const getAddressesHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const addresses = await getAddresses(req.user!.id);
  res.status(200).json({ success: true, data: { addresses } });
};

export const addAddressHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = createAddressSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const address = await addAddress(req.user!.id, value);
  res.status(201).json({ success: true, data: { address } });
};

export const updateAddressHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error: paramsError, value: params } = addressIdParamsSchema.validate(req.params);
  if (paramsError) {
    res.status(400).json({ success: false, message: paramsError.details[0].message });
    return;
  }
  const { error, value } = updateAddressSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const address = await updateAddress(req.user!.id, params.id, value);
  res.status(200).json({ success: true, data: { address } });
};

export const deleteAddressHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = addressIdParamsSchema.validate(req.params);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  await deleteAddress(req.user!.id, value.id);
  res.status(200).json({ success: true, message: 'Address deleted' });
};

export const setDefaultAddressHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = addressIdParamsSchema.validate(req.params);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const address = await setAddressAsDefault(req.user!.id, value.id);
  res.status(200).json({ success: true, data: { address } });
};
