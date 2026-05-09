import Joi from 'joi';

export const plantIdParamsSchema = Joi.object({
  plantId: Joi.string().length(24).hex().required(),
}).required();

export const wishlistQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(12),
}).required();
