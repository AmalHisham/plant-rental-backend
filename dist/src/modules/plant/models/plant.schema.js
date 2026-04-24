"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plantSchema = void 0;
const mongoose_1 = require("mongoose");
exports.plantSchema = new mongoose_1.Schema({
    // Core catalog fields shown in browse cards and details pages.
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    pricePerDay: { type: Number, required: true, min: 0 },
    depositAmount: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    careLevel: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    images: [{ type: String }],
    isAvailable: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });
// Text index for search
exports.plantSchema.index({ name: 'text', category: 'text', description: 'text' });
