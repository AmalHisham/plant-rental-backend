import Joi from 'joi';

export const createOrderSchema = Joi.object({
  plants: Joi.array()
    .items(
      Joi.object({
        // length(24) validates MongoDB ObjectId format before any DB lookup is attempted.
        plantId: Joi.string().length(24).required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
  rentalStartDate: Joi.date().min('now').required(), // cannot book in the past
  // Joi.ref('rentalStartDate') cross-references the sibling field — end must be after start.
  rentalEndDate: Joi.date().greater(Joi.ref('rentalStartDate')).required(),
  deliveryAddress: Joi.string().trim().min(5).required(),
  // valid(true) means this field must be the boolean true; false is rejected with a custom message.
  policyAccepted: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must accept the policies before placing an order',
  }),
}).required();

export const updateStatusSchema = Joi.object({
  status: Joi.string().valid('booked', 'delivered', 'picked').required(),
}).required();

export const updateDamageSchema = Joi.object({
  damageStatus: Joi.string().valid('none', 'minor', 'major').required(),
}).required();

export const updateDepositSchema = Joi.object({
  depositRefunded: Joi.boolean().required(),
}).required();

export const orderParamsSchema = Joi.object({
  id: Joi.string().length(24).hex().required(),
}).required();

export const checkoutSchema = Joi.object({
  deliveryAddress: Joi.string().trim().min(5).required(),
  policyAccepted: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must accept the policies before placing an order',
  }),
}).required();
