import Joi from 'joi';

export const plantIdParamsSchema = Joi.object({
  plantId: Joi.string().required(),
}).required();
