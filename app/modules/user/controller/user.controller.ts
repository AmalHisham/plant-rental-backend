import { Request, Response } from 'express';
import Joi from 'joi';
import {
  registerUser,
  loginUser,
  forgotPassword,
  validateResetToken,
  resetPassword,
} from '../service/user.service';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

// ─── Handlers ────────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }

  try {
    const result = await registerUser(value.name, value.email, value.password);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    const status = err.message === 'Email already in use' ? 409 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }

  try {
    const result = await loginUser(value.email, value.password);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(401).json({ success: false, message: err.message });
  }
};

export const forgotPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = forgotPasswordSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }

  try {
    await forgotPassword(value.email);
    res.status(200).json({
      success: true,
      message: 'If that email exists, a reset link has been sent',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const resetPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = resetPasswordSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }

  try {
    await resetPassword(value.token, value.newPassword);
    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (err: any) {
    const status = err.message.includes('invalid') || err.message.includes('expired') ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};
