"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkoutHandler = exports.updateDepositHandler = exports.updateDamageHandler = exports.updateStatusHandler = exports.getMyOrdersHandler = exports.createOrderHandler = void 0;
const joi_1 = __importDefault(require("joi"));
const order_service_1 = require("../service/order.service");
const createOrderSchema = joi_1.default.object({
    plants: joi_1.default.array()
        .items(joi_1.default.object({
        plantId: joi_1.default.string().length(24).required(),
        quantity: joi_1.default.number().integer().min(1).required(),
    }))
        .min(1)
        .required(),
    rentalStartDate: joi_1.default.date().min('now').required(),
    rentalEndDate: joi_1.default.date().greater(joi_1.default.ref('rentalStartDate')).required(),
    deliveryAddress: joi_1.default.string().trim().min(5).required(),
    policyAccepted: joi_1.default.boolean().valid(true).required().messages({
        'any.only': 'You must accept the policies before placing an order',
    }),
}).required();
const updateStatusSchema = joi_1.default.object({
    status: joi_1.default.string().valid('booked', 'delivered', 'picked').required(),
}).required();
const updateDamageSchema = joi_1.default.object({
    damageStatus: joi_1.default.string().valid('none', 'minor', 'major').required(),
}).required();
const updateDepositSchema = joi_1.default.object({
    depositRefunded: joi_1.default.boolean().required(),
}).required();
const createOrderHandler = async (req, res) => {
    // Validate the full checkout payload before the service calculates stock and totals.
    const { error, value } = createOrderSchema.validate(req.body, { abortEarly: false });
    if (error) {
        res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
        return;
    }
    const order = await (0, order_service_1.createOrder)({ userId: req.user.id, ...value });
    res.status(201).json({ success: true, data: order });
};
exports.createOrderHandler = createOrderHandler;
const getMyOrdersHandler = async (req, res) => {
    // A user can only see the orders that belong to their account.
    const orders = await (0, order_service_1.getOrdersByUser)(req.user.id);
    res.status(200).json({ success: true, data: orders });
};
exports.getMyOrdersHandler = getMyOrdersHandler;
const updateStatusHandler = async (req, res) => {
    // Delivery status changes stay separate from damage and refund handling.
    const { error, value } = updateStatusSchema.validate(req.body, { abortEarly: false });
    if (error) {
        res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
        return;
    }
    const order = await (0, order_service_1.updateOrderStatus)(req.params.id, value.status);
    if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
    }
    res.status(200).json({ success: true, data: order });
};
exports.updateStatusHandler = updateStatusHandler;
const updateDamageHandler = async (req, res) => {
    // Damage classification is tracked independently because it is usually set after inspection.
    const { error, value } = updateDamageSchema.validate(req.body, { abortEarly: false });
    if (error) {
        res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
        return;
    }
    const order = await (0, order_service_1.updateDamageStatus)(req.params.id, value.damageStatus);
    if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
    }
    res.status(200).json({ success: true, data: order });
};
exports.updateDamageHandler = updateDamageHandler;
const updateDepositHandler = async (req, res) => {
    // Deposit refund state is toggled separately so finance and ops can work independently.
    const { error, value } = updateDepositSchema.validate(req.body, { abortEarly: false });
    if (error) {
        res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
        return;
    }
    const order = await (0, order_service_1.updateDepositRefund)(req.params.id, value.depositRefunded);
    if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
    }
    res.status(200).json({ success: true, data: order });
};
exports.updateDepositHandler = updateDepositHandler;
const checkoutSchema = joi_1.default.object({
    deliveryAddress: joi_1.default.string().trim().min(5).required(),
    policyAccepted: joi_1.default.boolean().valid(true).required().messages({
        'any.only': 'You must accept the policies before placing an order',
    }),
}).required();
const checkoutHandler = async (req, res) => {
    // Checkout converts the saved cart into an order while keeping policy acceptance explicit.
    const { error, value } = checkoutSchema.validate(req.body, { abortEarly: false });
    if (error) {
        res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
        return;
    }
    const order = await (0, order_service_1.checkoutFromCart)(req.user.id, value.deliveryAddress, value.policyAccepted);
    res.status(201).json({ success: true, data: order });
};
exports.checkoutHandler = checkoutHandler;
