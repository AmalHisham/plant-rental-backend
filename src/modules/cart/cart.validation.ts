import Joi from 'joi';

export const addItemSchema = Joi.object({
  plantId: Joi.string().length(24).required(), // MongoDB ObjectId is always 24 hex chars
  quantity: Joi.number().integer().min(1).required(),
  rentalStartDate: Joi.date().min('now').required(),
  // Joi.ref('rentalStartDate') cross-validates against the sibling field so the range is always valid.
  rentalEndDate: Joi.date().greater(Joi.ref('rentalStartDate')).required(),
}).required();

// Update schema allows any subset of the three mutable fields.
// Final date range validity (start < end after merge) is checked in the service, not here,
// because the service needs to read the current values from the DB to do the merge.
export const updateItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1),
  rentalStartDate: Joi.date().min('now'),
  rentalEndDate: Joi.date().min('now'),
})
  .min(1) // reject empty update body
  .required();

export const plantIdParamsSchema = Joi.object({
  plantId: Joi.string().length(24).hex().required(),
}).required();
