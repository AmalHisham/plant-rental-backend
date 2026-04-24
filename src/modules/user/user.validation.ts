import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  // tlds: { allow: false } disables TLD validation — allows local/dev domains (e.g. user@test).
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required(),
  password: Joi.string().min(8).required(),
}).required();

export const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required(),
  password: Joi.string().required(),
}).required();

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required(),
}).required();

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
}).required();

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
}).required();

export const getAllUsersQuerySchema = Joi.object({
  role: Joi.string().valid('user', 'super_admin', 'product_admin', 'order_admin', 'delivery_admin', 'user_admin'),
  isActive: Joi.boolean(),
  isDeleted: Joi.boolean(),
  search: Joi.string().max(100),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
}).options({ convert: true }); // convert: true coerces query string values ('true' → true, '1' → 1)

export const userIdParamsSchema = Joi.object({
  id: Joi.string().required(),
}).required();

export const updateStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
}).required();
