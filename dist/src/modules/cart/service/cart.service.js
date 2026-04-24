"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeItem = exports.updateItem = exports.addItem = exports.getCart = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const cart_model_1 = require("../models/cart.model");
const plant_model_1 = require("../../plant/models/plant.model");
const AppError_1 = require("../../../utils/AppError");
// ─── Helpers ──────────────────────────────────────────────────────────────────
const computeRentalDays = (start, end) => Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
const PLANT_SELECT = 'name category pricePerDay depositAmount careLevel images isAvailable stock';
const validatePlant = async (plantId, quantity) => {
    // Make sure the plant exists, is available, and has enough stock before mutating the cart.
    const plant = await plant_model_1.Plant.findOne({ _id: plantId, isDeleted: false, isAvailable: true });
    if (!plant)
        throw new AppError_1.AppError('Plant not found or unavailable', 404);
    if (plant.stock < quantity)
        throw new AppError_1.AppError(`Insufficient stock. Only ${plant.stock} unit(s) available`, 400);
    return plant;
};
// ─── Get Cart ─────────────────────────────────────────────────────────────────
const getCart = async (userId) => {
    // Populate the plant snapshot so pricing can be recalculated server-side.
    const cart = await cart_model_1.Cart.findOne({ userId }).populate('items.plantId', PLANT_SELECT);
    if (!cart)
        return { userId, items: [], cartTotal: 0 };
    const items = cart.items.map((item) => {
        const plant = item.plantId;
        const rentalDays = computeRentalDays(item.rentalStartDate, item.rentalEndDate);
        const rentalTotal = plant.pricePerDay * rentalDays * item.quantity;
        const deposit = plant.depositAmount * item.quantity;
        return {
            plantId: plant,
            quantity: item.quantity,
            rentalStartDate: item.rentalStartDate,
            rentalEndDate: item.rentalEndDate,
            rentalDays,
            rentalTotal,
            deposit,
            itemTotal: rentalTotal + deposit,
        };
    });
    const cartTotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
    return { _id: cart._id, userId: cart.userId, items, cartTotal };
};
exports.getCart = getCart;
// ─── Add Item ─────────────────────────────────────────────────────────────────
const addItem = async (userId, input) => {
    // Validate stock first, then either create the cart or append to the existing one.
    await validatePlant(input.plantId, input.quantity);
    let cart = await cart_model_1.Cart.findOne({ userId });
    if (!cart) {
        await cart_model_1.Cart.create({
            userId,
            items: [
                {
                    plantId: input.plantId,
                    quantity: input.quantity,
                    rentalStartDate: input.rentalStartDate,
                    rentalEndDate: input.rentalEndDate,
                },
            ],
        });
        return (0, exports.getCart)(userId);
    }
    const alreadyInCart = cart.items.some((i) => i.plantId.toString() === input.plantId);
    if (alreadyInCart)
        throw new AppError_1.AppError('Plant already in cart. Use PUT /api/cart/items/:plantId to update', 400);
    cart.items.push({
        plantId: new mongoose_1.default.Types.ObjectId(input.plantId),
        quantity: input.quantity,
        rentalStartDate: input.rentalStartDate,
        rentalEndDate: input.rentalEndDate,
    });
    await cart.save();
    return (0, exports.getCart)(userId);
};
exports.addItem = addItem;
// ─── Update Item ──────────────────────────────────────────────────────────────
const updateItem = async (userId, plantId, input) => {
    // Update one cart item at a time so quantity and rental window stay in sync.
    const cart = await cart_model_1.Cart.findOne({ userId });
    if (!cart)
        throw new AppError_1.AppError('Plant not in cart', 404);
    const item = cart.items.find((i) => i.plantId.toString() === plantId);
    if (!item)
        throw new AppError_1.AppError('Plant not in cart', 404);
    const newQuantity = input.quantity ?? item.quantity;
    await validatePlant(plantId, newQuantity);
    // Validate final date range using merged values
    const finalStart = input.rentalStartDate ?? item.rentalStartDate;
    const finalEnd = input.rentalEndDate ?? item.rentalEndDate;
    if (finalEnd <= finalStart)
        throw new AppError_1.AppError('Rental end date must be after start date', 400);
    if (input.quantity !== undefined)
        item.quantity = input.quantity;
    if (input.rentalStartDate !== undefined)
        item.rentalStartDate = input.rentalStartDate;
    if (input.rentalEndDate !== undefined)
        item.rentalEndDate = input.rentalEndDate;
    await cart.save();
    return (0, exports.getCart)(userId);
};
exports.updateItem = updateItem;
// ─── Remove Item ──────────────────────────────────────────────────────────────
const removeItem = async (userId, plantId) => {
    // Removing from the cart is a simple filter operation with a not-found check.
    const cart = await cart_model_1.Cart.findOne({ userId });
    if (!cart)
        throw new AppError_1.AppError('Plant not in cart', 400);
    const before = cart.items.length;
    cart.items = cart.items.filter((i) => i.plantId.toString() !== plantId);
    if (cart.items.length === before)
        throw new AppError_1.AppError('Plant not in cart', 400);
    await cart.save();
    return (0, exports.getCart)(userId);
};
exports.removeItem = removeItem;
// ─── Clear Cart ───────────────────────────────────────────────────────────────
const clearCart = async (userId) => {
    // Reset the cart contents without deleting the cart document itself.
    await cart_model_1.Cart.findOneAndUpdate({ userId }, { items: [] });
};
exports.clearCart = clearCart;
