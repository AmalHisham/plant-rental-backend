import Joi from 'joi';

export const plantIdParamsSchema = Joi.object({
  plantId: Joi.string().length(24).hex().required(),
}).required();
