import Joi from 'joi';

export const getAllOrdersAdminSchema = Joi.object({
  status: Joi.string().valid('booked', 'delivered', 'picked'),
  damageStatus: Joi.string().valid('none', 'minor', 'major'),
  paymentStatus: Joi.string().valid('pending', 'paid', 'failed'),
  userId: Joi.string().length(24), // optional filter to view one user's orders
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  startDate: Joi.date(),
  endDate: Joi.date(),
});

export const createAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required(),
  // The 'user' role is excluded — creating a normal user account through the admin
  // endpoint is disallowed by both Joi and an extra guard in the service.
  role: Joi.string()
    .valid('super_admin', 'product_admin', 'order_admin', 'delivery_admin', 'user_admin')
    .required()
    .messages({ 'any.only': 'Role must be a valid admin role (not "user")' }),
}).required();
