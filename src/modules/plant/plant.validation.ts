import Joi from 'joi';

export const createPlantSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  category: Joi.string().trim().min(2).max(50).required(),
  description: Joi.string().trim().min(10).max(1000).required(),
  pricePerDay: Joi.number().min(0).required(),
  depositAmount: Joi.number().min(0).required(),
  stock: Joi.number().integer().min(0).required(),
  careLevel: Joi.string().valid('easy', 'medium', 'hard').required(),
  images: Joi.array().items(Joi.string().uri()).default([]),
  isAvailable: Joi.boolean().default(true),
}).required();

// .min(1) enforces that at least one field must be sent —
// an empty PATCH body would otherwise pass validation and do nothing silently.
export const updatePlantSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  category: Joi.string().trim().min(2).max(50),
  description: Joi.string().trim().min(10).max(1000),
  pricePerDay: Joi.number().min(0),
  depositAmount: Joi.number().min(0),
  stock: Joi.number().integer().min(0),
  careLevel: Joi.string().valid('easy', 'medium', 'hard'),
  images: Joi.array().items(Joi.string().uri()),
  isAvailable: Joi.boolean(),
}).min(1).required();

export const plantParamsSchema = Joi.object({
  id: Joi.string().length(24).hex().required(),
}).required();

export const deleteImageSchema = Joi.object({
  imageUrl: Joi.string().uri().required(),
}).required();

// Query filter schema — convert: true (passed inline in controller) coerces string query params
// to the correct types ('true' → true, '12' → 12).
export const filterSchema = Joi.object({
  category: Joi.string().trim(),
  careLevel: Joi.string().valid('easy', 'medium', 'hard'),
  isAvailable: Joi.boolean(),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  search: Joi.string().trim(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(12),
});
