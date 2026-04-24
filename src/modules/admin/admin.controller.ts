import { Response } from 'express';
import Joi from 'joi';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { getDashboardStats, getAllOrdersAdmin, createAdminUser } from './admin.service';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const getAllOrdersAdminSchema = Joi.object({
  status: Joi.string().valid('booked', 'delivered', 'picked'),
  damageStatus: Joi.string().valid('none', 'minor', 'major'),
  paymentStatus: Joi.string().valid('pending', 'paid', 'failed'),
  userId: Joi.string().length(24), // optional filter to view one user's orders
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  startDate: Joi.date(),
  endDate: Joi.date(),
});

const createAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required(),
  // The 'user' role is excluded — creating a normal user account through the admin
  // endpoint is disallowed by both Joi and an extra guard in the service.
  role: Joi.string()
    .valid('super_admin', 'product_admin', 'order_admin', 'delivery_admin', 'user_admin')
    .required()
    .messages({ 'any.only': 'Role must be a valid admin role (not "user")' }),
}).required();

// ─── Handlers ────────────────────────────────────────────────────────────────

export const getDashboardStatsHandler = async (_req: AuthRequest, res: Response): Promise<void> => {
  const stats = await getDashboardStats();
  res.status(200).json({ success: true, data: stats });
};

export const getAllOrdersAdminHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  // convert: true coerces string query params to booleans, numbers, and dates before validation.
  const { error, value } = getAllOrdersAdminSchema.validate(req.query, { convert: true });
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const result = await getAllOrdersAdmin(value);
  res.status(200).json({ success: true, data: result });
};

export const createAdminHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  // abortEarly: false returns all validation errors at once (helpful for form submissions).
  const { error, value } = createAdminSchema.validate(req.body, { abortEarly: false });
  if (error) {
    res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
    return;
  }
  const user = await createAdminUser(value.name, value.email, value.role);
  res.status(201).json({ success: true, data: user });
};
