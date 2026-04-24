"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPaymentHandler = exports.createPaymentOrderHandler = void 0;
const joi_1 = __importDefault(require("joi"));
const payment_service_1 = require("../service/payment.service");
const AppError_1 = require("../../../utils/AppError");
const createPaymentOrderSchema = joi_1.default.object({
    orderId: joi_1.default.string().length(24).required(),
}).required();
const verifyPaymentSchema = joi_1.default.object({
    razorpayOrderId: joi_1.default.string().required(),
    razorpayPaymentId: joi_1.default.string().required(),
    signature: joi_1.default.string().required(),
}).required();
const createPaymentOrderHandler = async (req, res) => {
    // A Razorpay order can only be created after the app confirms the target order ID.
    const { error, value } = createPaymentOrderSchema.validate(req.body);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const result = await (0, payment_service_1.createRazorpayOrder)(value.orderId, req.user.id);
    res.status(200).json({ success: true, data: result });
};
exports.createPaymentOrderHandler = createPaymentOrderHandler;
const verifyPaymentHandler = async (req, res) => {
    // Signature verification happens before we mark the payment as paid.
    const { error, value } = verifyPaymentSchema.validate(req.body);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const isValid = (0, payment_service_1.verifyPayment)(value.razorpayOrderId, value.razorpayPaymentId, value.signature);
    if (!isValid) {
        await (0, payment_service_1.updateOrderPaymentStatus)(value.razorpayOrderId, value.razorpayPaymentId, 'failed');
        throw new AppError_1.AppError('Invalid payment signature', 400);
    }
    const payment = await (0, payment_service_1.updateOrderPaymentStatus)(value.razorpayOrderId, value.razorpayPaymentId, 'paid');
    res.status(200).json({ success: true, data: { payment } });
};
exports.verifyPaymentHandler = verifyPaymentHandler;
