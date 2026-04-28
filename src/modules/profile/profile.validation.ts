import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9]{10}$/)
    .messages({ 'string.pattern.base': 'Phone number must be exactly 10 digits' }),
}).min(1).required();

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
}).required();

export const createAddressSchema = Joi.object({
  label: Joi.string().trim().min(1).max(50).required(),
  recipientName: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({ 'string.pattern.base': 'Phone number must be exactly 10 digits' }),
  addressLine1: Joi.string().trim().min(5).max(200).required(),
  addressLine2: Joi.string().trim().max(200).allow('').optional(),
  city: Joi.string().trim().min(2).max(100).required(),
  state: Joi.string().trim().min(2).max(100).required(),
  pincode: Joi.string()
    .trim()
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({ 'string.pattern.base': 'Pincode must be exactly 6 digits' }),
  isDefault: Joi.boolean().default(false),
}).required();

export const updateAddressSchema = Joi.object({
  label: Joi.string().trim().min(1).max(50),
  recipientName: Joi.string().trim().min(2).max(100),
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9]{10}$/)
    .messages({ 'string.pattern.base': 'Phone number must be exactly 10 digits' }),
  addressLine1: Joi.string().trim().min(5).max(200),
  addressLine2: Joi.string().trim().max(200).allow('').optional(),
  city: Joi.string().trim().min(2).max(100),
  state: Joi.string().trim().min(2).max(100),
  pincode: Joi.string()
    .trim()
    .pattern(/^[0-9]{6}$/)
    .messages({ 'string.pattern.base': 'Pincode must be exactly 6 digits' }),
  // isDefault is not patchable via this schema — use the /default endpoint for that.
}).min(1).required();

export const addressIdParamsSchema = Joi.object({
  id: Joi.string().length(24).hex().required(),
}).required();
