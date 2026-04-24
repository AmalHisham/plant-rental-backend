"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePlantHandler = exports.updatePlantHandler = exports.createPlantHandler = exports.getPlant = exports.getPlants = void 0;
const joi_1 = __importDefault(require("joi"));
const plant_service_1 = require("../service/plant.service");
// ─── Validation Schemas ───────────────────────────────────────────────────────
const createPlantSchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(2).max(100).required(),
    category: joi_1.default.string().trim().min(2).max(50).required(),
    description: joi_1.default.string().trim().min(10).max(1000).required(),
    pricePerDay: joi_1.default.number().min(0).required(),
    depositAmount: joi_1.default.number().min(0).required(),
    stock: joi_1.default.number().integer().min(0).required(),
    careLevel: joi_1.default.string().valid('easy', 'medium', 'hard').required(),
    images: joi_1.default.array().items(joi_1.default.string().uri()).default([]),
    isAvailable: joi_1.default.boolean().default(true),
}).required();
const updatePlantSchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(2).max(100),
    category: joi_1.default.string().trim().min(2).max(50),
    description: joi_1.default.string().trim().min(10).max(1000),
    pricePerDay: joi_1.default.number().min(0),
    depositAmount: joi_1.default.number().min(0),
    stock: joi_1.default.number().integer().min(0),
    careLevel: joi_1.default.string().valid('easy', 'medium', 'hard'),
    images: joi_1.default.array().items(joi_1.default.string().uri()),
    isAvailable: joi_1.default.boolean(),
}).min(1).required(); // at least one field required
const filterSchema = joi_1.default.object({
    category: joi_1.default.string().trim(),
    careLevel: joi_1.default.string().valid('easy', 'medium', 'hard'),
    isAvailable: joi_1.default.boolean(),
    minPrice: joi_1.default.number().min(0),
    maxPrice: joi_1.default.number().min(0),
    search: joi_1.default.string().trim(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(50).default(12),
});
// ─── Handlers ────────────────────────────────────────────────────────────────
const getPlants = async (req, res) => {
    // Validate query filters up front so the service can focus on database logic.
    const { error, value } = filterSchema.validate(req.query, { convert: true });
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const result = await (0, plant_service_1.getAllPlants)(value);
    res.status(200).json({ success: true, data: result });
};
exports.getPlants = getPlants;
const getPlant = async (req, res) => {
    // Return a clean 404 when the plant is missing instead of passing null to the client.
    const plant = await (0, plant_service_1.getPlantById)(req.params.id);
    if (!plant) {
        res.status(404).json({ success: false, message: 'Plant not found' });
        return;
    }
    res.status(200).json({ success: true, data: plant });
};
exports.getPlant = getPlant;
const createPlantHandler = async (req, res) => {
    // The create flow only accepts a fully validated payload.
    const { error, value } = createPlantSchema.validate(req.body);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const plant = await (0, plant_service_1.createPlant)(value);
    res.status(201).json({ success: true, data: plant });
};
exports.createPlantHandler = createPlantHandler;
const updatePlantHandler = async (req, res) => {
    // Updates are partial, but they still need at least one field to change.
    const { error, value } = updatePlantSchema.validate(req.body);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const plant = await (0, plant_service_1.updatePlant)(req.params.id, value);
    if (!plant) {
        res.status(404).json({ success: false, message: 'Plant not found' });
        return;
    }
    res.status(200).json({ success: true, data: plant });
};
exports.updatePlantHandler = updatePlantHandler;
const deletePlantHandler = async (req, res) => {
    // The service performs a soft delete so old order references still make sense.
    const plant = await (0, plant_service_1.deletePlant)(req.params.id);
    if (!plant) {
        res.status(404).json({ success: false, message: 'Plant not found' });
        return;
    }
    res.status(200).json({ success: true, message: 'Plant deleted successfully' });
};
exports.deletePlantHandler = deletePlantHandler;
