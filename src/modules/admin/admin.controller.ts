import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { getDashboardStats, getAllOrdersAdmin, createAdminUser } from './admin.service';
import { getAllOrdersAdminSchema, createAdminSchema } from './admin.validation';

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
