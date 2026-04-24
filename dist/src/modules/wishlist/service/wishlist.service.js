"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFromWishlist = exports.addToWishlist = exports.getWishlist = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const wishlist_model_1 = require("../models/wishlist.model");
const plant_model_1 = require("../../plant/models/plant.model");
const AppError_1 = require("../../../utils/AppError");
const PLANT_POPULATE_SELECT = 'name category pricePerDay depositAmount careLevel images isAvailable stock';
// ─── Get Wishlist ─────────────────────────────────────────────────────────────
const getWishlist = async (userId) => {
    // Populate the plant details so the UI can render wishlist cards without extra calls.
    const wishlist = await wishlist_model_1.Wishlist.findOne({ userId }).populate('plants.plantId', PLANT_POPULATE_SELECT);
    // Return a consistent shape even when no wishlist document exists yet
    return wishlist ?? { userId, plants: [] };
};
exports.getWishlist = getWishlist;
// ─── Add To Wishlist ──────────────────────────────────────────────────────────
const addToWishlist = async (userId, plantId) => {
    // Only wishlist plants that still exist and are currently available.
    const plant = await plant_model_1.Plant.findOne({ _id: plantId, isDeleted: false, isAvailable: true });
    if (!plant)
        throw new AppError_1.AppError('Plant not found or unavailable', 404);
    let wishlist = await wishlist_model_1.Wishlist.findOne({ userId });
    if (!wishlist) {
        wishlist = await wishlist_model_1.Wishlist.create({ userId, plants: [{ plantId }] });
        return wishlist.populate('plants.plantId', PLANT_POPULATE_SELECT);
    }
    const alreadyAdded = wishlist.plants.some((p) => p.plantId.toString() === plantId);
    if (alreadyAdded)
        throw new AppError_1.AppError('Plant already in wishlist', 400);
    wishlist.plants.push({ plantId: new mongoose_1.default.Types.ObjectId(plantId) });
    await wishlist.save();
    return wishlist.populate('plants.plantId', PLANT_POPULATE_SELECT);
};
exports.addToWishlist = addToWishlist;
// ─── Remove From Wishlist ─────────────────────────────────────────────────────
const removeFromWishlist = async (userId, plantId) => {
    // Validate that the plant was actually present before reporting success.
    const wishlist = await wishlist_model_1.Wishlist.findOne({ userId });
    if (!wishlist)
        throw new AppError_1.AppError('Plant not in wishlist', 400);
    const before = wishlist.plants.length;
    wishlist.plants = wishlist.plants.filter((p) => p.plantId.toString() !== plantId);
    if (wishlist.plants.length === before)
        throw new AppError_1.AppError('Plant not in wishlist', 400);
    await wishlist.save();
    return wishlist.populate('plants.plantId', PLANT_POPULATE_SELECT);
};
exports.removeFromWishlist = removeFromWishlist;
