"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderPaymentStatus = exports.verifyPayment = exports.createRazorpayOrder = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const order_model_1 = require("../../order/models/order.model");
const plant_model_1 = require("../../plant/models/plant.model");
const payment_model_1 = require("../models/payment.model");
const AppError_1 = require("../../../utils/AppError");
const getRazorpay = () => new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const createRazorpayOrder = async (orderId, userId) => {
    // Create the upstream Razorpay order only after the internal order exists.
    const order = await order_model_1.Order.findOne({ _id: orderId, isDeleted: false });
    if (!order)
        throw new AppError_1.AppError('Order not found', 404);
    const razorpay = getRazorpay();
    const rzpOrder = await razorpay.orders.create({
        amount: Math.round(order.totalPrice * 100), // paise
        currency: 'INR',
        receipt: orderId,
    });
    const payment = await payment_model_1.Payment.create({
        orderId: new mongoose_1.default.Types.ObjectId(orderId),
        userId: new mongoose_1.default.Types.ObjectId(userId),
        razorpayOrderId: rzpOrder.id,
        amount: order.totalPrice,
        currency: 'INR',
        status: 'pending',
    });
    await order_model_1.Order.findByIdAndUpdate(orderId, { razorpayOrderId: rzpOrder.id });
    // Return the data the frontend needs to open the checkout widget.
    return {
        razorpayOrderId: rzpOrder.id,
        amount: order.totalPrice,
        currency: 'INR',
        paymentId: payment._id.toString(),
    };
};
exports.createRazorpayOrder = createRazorpayOrder;
const verifyPayment = (razorpayOrderId, razorpayPaymentId, signature) => {
    // Rebuild the signature locally so we can compare it with Razorpay's callback value.
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expected = crypto_1.default
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');
    return expected === signature;
};
exports.verifyPayment = verifyPayment;
const updateOrderPaymentStatus = async (razorpayOrderId, razorpayPaymentId, status) => {
    // Keep payment and order records aligned, and roll stock back if payment fails.
    const payment = await payment_model_1.Payment.findOneAndUpdate({ razorpayOrderId }, { razorpayPaymentId, status }, { returnDocument: 'after' });
    if (payment) {
        await order_model_1.Order.findByIdAndUpdate(payment.orderId, { paymentStatus: status });
        if (status === 'failed') {
            // Failed payments should release the reserved stock back into inventory.
            const order = await order_model_1.Order.findById(payment.orderId);
            if (order) {
                for (const item of order.plants) {
                    await plant_model_1.Plant.findByIdAndUpdate(item.plantId, { $inc: { stock: item.quantity } });
                }
            }
        }
    }
    return payment;
};
exports.updateOrderPaymentStatus = updateOrderPaymentStatus;
