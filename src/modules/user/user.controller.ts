// User controller — validates HTTP input with Joi, delegates business logic to user.service.ts,
// and sends the HTTP response. No try-catch blocks here; catchAsync in routes handles rejections.

import { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logoutUser,
  getAllUsers,
  getUserById,
  updateUserStatus,
  softDeleteUser,
} from './service/user.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  getAllUsersQuerySchema,
  userIdParamsSchema,
  updateStatusSchema,
} from './user.validation';

// ─── Auth Handlers ────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const result = await registerUser(value.name, value.email, value.password);
  res.status(201).json({ success: true, data: result });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const result = await loginUser(value.email, value.password);
  res.status(200).json({ success: true, data: result });
};

export const forgotPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = forgotPasswordSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  await forgotPassword(value.email);
  // Generic response — the service silently does nothing for unknown emails,
  // so this message never reveals whether the email is registered.
  res.status(200).json({
    success: true,
    message: 'If that email exists, a reset link has been sent',
  });
};

export const resetPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = resetPasswordSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  await resetPassword(value.token, value.newPassword);
  res.status(200).json({ success: true, message: 'Password reset successful' });
};

export const refreshTokenHandler = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = refreshTokenSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const result = await refreshAccessToken(value.refreshToken);
  res.status(200).json({ success: true, data: result });
};

export const logoutHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  // req.user is guaranteed to exist here because protect middleware runs before this handler.
  // The non-null assertion (!) is intentional — TypeScript doesn't know protect sets user.
  await logoutUser(req.user!.id);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// ─── User Management Handlers ─────────────────────────────────────────────────

export const getAllUsersHandler = async (req: Request, res: Response): Promise<void> => {
  // req.query values are always strings — convert: true in the schema converts them
  // to the correct types (boolean, number) before passing to the service.
  const { error, value } = getAllUsersQuerySchema.validate(req.query);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const result = await getAllUsers(value);
  res.status(200).json({ success: true, data: result });
};

export const getUserByIdHandler = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = userIdParamsSchema.validate(req.params);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const user = await getUserById(value.id);
  res.status(200).json({ success: true, data: { user } });
};

export const updateUserStatusHandler = async (req: Request, res: Response): Promise<void> => {
  // Validate params and body separately so the error messages are specific to each part.
  const { error: paramsError, value: params } = userIdParamsSchema.validate(req.params);
  if (paramsError) {
    res.status(400).json({ success: false, message: paramsError.details[0].message });
    return;
  }
  const { error, value } = updateStatusSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const user = await updateUserStatus(params.id, value.isActive);
  res.status(200).json({ success: true, data: { user } });
};

export const deleteUserHandler = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = userIdParamsSchema.validate(req.params);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  // Soft delete — sets isDeleted: true in DB; the record is retained for audit purposes.
  await softDeleteUser(value.id);
  res.status(200).json({ success: true, message: 'User deleted successfully' });
};
