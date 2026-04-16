import { Request, Response } from 'express';
import Joi from 'joi';
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
} from '../service/user.service';
import { AuthRequest } from '../../../middlewares/auth.middleware';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required(),
  password: Joi.string().min(8).required(),
}).required();

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required(),
  password: Joi.string().required(),
}).required();

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required(),
}).required();

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
}).required();

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
}).required();

// ─── Handlers ────────────────────────────────────────────────────────────────

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
  await logoutUser(req.user!.id);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// ─── User Management Schemas ──────────────────────────────────────────────────

const getAllUsersQuerySchema = Joi.object({
  role: Joi.string().valid('user', 'super_admin', 'product_admin', 'order_admin', 'delivery_admin', 'user_admin'),
  isActive: Joi.boolean(),
  isDeleted: Joi.boolean(),
  search: Joi.string().max(100),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
}).options({ convert: true });

const userIdParamsSchema = Joi.object({
  id: Joi.string().required(),
}).required();

const updateStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
}).required();

// ─── User Management Handlers ─────────────────────────────────────────────────

export const getAllUsersHandler = async (req: Request, res: Response): Promise<void> => {
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
  await softDeleteUser(value.id);
  res.status(200).json({ success: true, message: 'User deleted successfully' });
};
