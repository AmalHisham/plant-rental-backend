import Joi from 'joi';

export const createPaymentOrderSchema = Joi.object({
  orderId: Joi.string().length(24).required(), // must be a valid 24-char MongoDB ObjectId
}).required();

export const verifyPaymentSchema = Joi.object({
  razorpayOrderId: Joi.string().required(),
  razorpayPaymentId: Joi.string().required(),
  // signature is the HMAC-SHA256 value returned by the Razorpay checkout widget
  signature: Joi.string().required(),
}).required();
