"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePlant = exports.updatePlant = exports.createPlant = exports.getPlantById = exports.getAllPlants = void 0;
const plant_model_1 = require("../models/plant.model");
// ─── Get All (with filters + pagination) ────────────────────────────────────
const getAllPlants = async (filters) => {
    // Build the filter object incrementally so each optional input stays easy to reason about.
    const { category, careLevel, isAvailable, minPrice, maxPrice, search, page = 1, limit = 12, } = filters;
    const query = { isDeleted: false };
    if (category)
        query.category = { $regex: category, $options: 'i' };
    if (careLevel)
        query.careLevel = careLevel;
    if (typeof isAvailable === 'boolean')
        query.isAvailable = isAvailable;
    if (minPrice !== undefined || maxPrice !== undefined) {
        query.pricePerDay = {};
        if (minPrice !== undefined)
            query.pricePerDay.$gte = minPrice;
        if (maxPrice !== undefined)
            query.pricePerDay.$lte = maxPrice;
    }
    if (search)
        query.name = { $regex: search, $options: 'i' };
    const skip = (page - 1) * limit;
    const [plants, total] = await Promise.all([
        plant_model_1.Plant.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
        plant_model_1.Plant.countDocuments(query),
    ]);
    return {
        plants,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};
exports.getAllPlants = getAllPlants;
// ─── Get One ─────────────────────────────────────────────────────────────────
const getPlantById = async (id) => {
    // Public reads skip soft-deleted records.
    return plant_model_1.Plant.findOne({ _id: id, isDeleted: false });
};
exports.getPlantById = getPlantById;
// ─── Create ──────────────────────────────────────────────────────────────────
const createPlant = async (data) => {
    // Persistence happens here once the controller has already validated the payload.
    return plant_model_1.Plant.create(data);
};
exports.createPlant = createPlant;
// ─── Update ──────────────────────────────────────────────────────────────────
const updatePlant = async (id, data) => {
    // Return the updated plant so admin UIs can refresh the card/details view immediately.
    return plant_model_1.Plant.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true });
};
exports.updatePlant = updatePlant;
// ─── Delete ──────────────────────────────────────────────────────────────────
const deletePlant = async (id) => {
    // Soft delete preserves the record for historical reporting and relations.
    return plant_model_1.Plant.findByIdAndUpdate(id, { isDeleted: true }, { returnDocument: 'after' });
};
exports.deletePlant = deletePlant;
