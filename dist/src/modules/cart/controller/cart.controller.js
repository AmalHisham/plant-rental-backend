"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCartHandler = exports.removeItemHandler = exports.updateItemHandler = exports.addItemHandler = exports.getCartHandler = void 0;
const joi_1 = __importDefault(require("joi"));
const cart_service_1 = require("../service/cart.service");
// ─── Validation Schemas ───────────────────────────────────────────────────────
const addItemSchema = joi_1.default.object({
    plantId: joi_1.default.string().length(24).required(),
    quantity: joi_1.default.number().integer().min(1).required(),
    rentalStartDate: joi_1.default.date().min('now').required(),
    rentalEndDate: joi_1.default.date().greater(joi_1.default.ref('rentalStartDate')).required(),
}).required();
// For updates, dates are validated together in the service (only one may be provided)
const updateItemSchema = joi_1.default.object({
    quantity: joi_1.default.number().integer().min(1),
    rentalStartDate: joi_1.default.date().min('now'),
    rentalEndDate: joi_1.default.date().min('now'),
})
    .min(1)
    .required();
const plantIdParamsSchema = joi_1.default.object({
    plantId: joi_1.default.string().required(),
}).required();
// ─── Handlers ────────────────────────────────────────────────────────────────
const getCartHandler = async (req, res) => {
    // Always return the server-calculated cart totals so the client cannot drift.
    const cart = await (0, cart_service_1.getCart)(req.user.id);
    res.status(200).json({ success: true, data: { cart } });
};
exports.getCartHandler = getCartHandler;
const addItemHandler = async (req, res) => {
    // Validate the request before the service checks stock and creates the cart row.
    const { error, value } = addItemSchema.validate(req.body);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const cart = await (0, cart_service_1.addItem)(req.user.id, value);
    res.status(200).json({ success: true, data: { cart } });
};
exports.addItemHandler = addItemHandler;
const updateItemHandler = async (req, res) => {
    // The path param identifies the cart item; the body only carries the fields to change.
    const { error: paramsError, value: params } = plantIdParamsSchema.validate(req.params);
    if (paramsError) {
        res.status(400).json({ success: false, message: paramsError.details[0].message });
        return;
    }
    const { error, value } = updateItemSchema.validate(req.body);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const cart = await (0, cart_service_1.updateItem)(req.user.id, params.plantId, value);
    res.status(200).json({ success: true, data: { cart } });
};
exports.updateItemHandler = updateItemHandler;
const removeItemHandler = async (req, res) => {
    // Removing an item is a distinct action from updating quantity or dates.
    const { error, value } = plantIdParamsSchema.validate(req.params);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const cart = await (0, cart_service_1.removeItem)(req.user.id, value.plantId);
    res.status(200).json({ success: true, data: { cart } });
};
exports.removeItemHandler = removeItemHandler;
const clearCartHandler = async (req, res) => {
    // Clearing the cart simply wipes the saved items array for this user.
    await (0, cart_service_1.clearCart)(req.user.id);
    res.status(200).json({ success: true, message: 'Cart cleared' });
};
exports.clearCartHandler = clearCartHandler;
