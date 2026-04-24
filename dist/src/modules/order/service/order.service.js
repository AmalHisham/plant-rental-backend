"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkoutFromCart = exports.updateDepositRefund = exports.updateDamageStatus = exports.updateOrderStatus = exports.getOrderById = exports.getOrdersByUser = exports.createOrder = void 0;
const plant_model_1 = require("../../plant/models/plant.model");
const cart_model_1 = require("../../cart/models/cart.model");
const order_model_1 = require("../models/order.model");
const AppError_1 = require("../../../utils/AppError");
const mongoose_1 = __importDefault(require("mongoose"));
const createOrder = async (input) => {
    // This path is used when an order is assembled directly from request payload.
    const { userId, plants, rentalStartDate, rentalEndDate, deliveryAddress, policyAccepted } = input;
    const days = Math.ceil((rentalEndDate.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24));
    let rentalTotal = 0;
    let deposit = 0;
    for (const item of plants) {
        // Reload the plant so pricing and stock checks use the current database state.
        const plant = await plant_model_1.Plant.findById(item.plantId);
        if (!plant || plant.isDeleted)
            throw new AppError_1.AppError(`Plant not found: ${item.plantId}`, 404);
        if (!plant.isAvailable || plant.stock < item.quantity) {
            throw new AppError_1.AppError(`Insufficient stock for plant: ${plant.name}`, 400);
        }
        rentalTotal += plant.pricePerDay * days * item.quantity;
        deposit += plant.depositAmount * item.quantity;
    }
    const totalPrice = rentalTotal + deposit;
    // Decrement stock
    // Stock is updated only after every requested plant has passed validation.
    for (const item of plants) {
        await plant_model_1.Plant.findByIdAndUpdate(item.plantId, { $inc: { stock: -item.quantity } });
    }
    const order = await order_model_1.Order.create({
        userId: new mongoose_1.default.Types.ObjectId(userId),
        plants: plants.map((p) => ({
            plantId: new mongoose_1.default.Types.ObjectId(p.plantId),
            quantity: p.quantity,
        })),
        rentalStartDate,
        rentalEndDate,
        totalPrice,
        deposit,
        deliveryAddress,
        policyAccepted,
    });
    return order;
};
exports.createOrder = createOrder;
const getOrdersByUser = async (userId) => {
    return order_model_1.Order.find({ userId, isDeleted: false }).sort({ createdAt: -1 });
};
exports.getOrdersByUser = getOrdersByUser;
const getOrderById = async (orderId) => {
    return order_model_1.Order.findOne({ _id: orderId, isDeleted: false });
};
exports.getOrderById = getOrderById;
const updateOrderStatus = async (orderId, status) => {
    return order_model_1.Order.findByIdAndUpdate(orderId, { status }, { returnDocument: 'after' });
};
exports.updateOrderStatus = updateOrderStatus;
const updateDamageStatus = async (orderId, damageStatus) => {
    return order_model_1.Order.findByIdAndUpdate(orderId, { damageStatus }, { returnDocument: 'after' });
};
exports.updateDamageStatus = updateDamageStatus;
const updateDepositRefund = async (orderId, depositRefunded) => {
    return order_model_1.Order.findByIdAndUpdate(orderId, { depositRefunded }, { returnDocument: 'after' });
};
exports.updateDepositRefund = updateDepositRefund;
const checkoutFromCart = async (userId, deliveryAddress, policyAccepted) => {
    // The cart checkout path reuses the same pricing logic but derives the order lines from saved items.
    const cart = await cart_model_1.Cart.findOne({ userId });
    if (!cart || cart.items.length === 0)
        throw new AppError_1.AppError('Cart is empty', 400);
    let rentalTotal = 0;
    let deposit = 0;
    let minStart = cart.items[0].rentalStartDate;
    let maxEnd = cart.items[0].rentalEndDate;
    for (const item of cart.items) {
        // Each cart item is revalidated because the cart may be stale by the time checkout runs.
        const plant = await plant_model_1.Plant.findById(item.plantId);
        if (!plant || plant.isDeleted)
            throw new AppError_1.AppError(`Plant not found: ${item.plantId}`, 404);
        if (!plant.isAvailable || plant.stock < item.quantity) {
            throw new AppError_1.AppError(`Insufficient stock for plant: ${plant.name}`, 400);
        }
        const days = Math.ceil((item.rentalEndDate.getTime() - item.rentalStartDate.getTime()) / (1000 * 60 * 60 * 24));
        rentalTotal += plant.pricePerDay * days * item.quantity;
        deposit += plant.depositAmount * item.quantity;
        if (item.rentalStartDate < minStart)
            minStart = item.rentalStartDate;
        if (item.rentalEndDate > maxEnd)
            maxEnd = item.rentalEndDate;
    }
    const totalPrice = rentalTotal + deposit;
    for (const item of cart.items) {
        await plant_model_1.Plant.findByIdAndUpdate(item.plantId, { $inc: { stock: -item.quantity } });
    }
    const order = await order_model_1.Order.create({
        userId: new mongoose_1.default.Types.ObjectId(userId),
        plants: cart.items.map((item) => ({
            plantId: item.plantId,
            quantity: item.quantity,
        })),
        rentalStartDate: minStart,
        rentalEndDate: maxEnd,
        totalPrice,
        deposit,
        deliveryAddress,
        policyAccepted,
    });
    await cart_model_1.Cart.findOneAndUpdate({ userId }, { items: [] });
    return order;
};
exports.checkoutFromCart = checkoutFromCart;
