"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartSchema = void 0;
const mongoose_1 = require("mongoose");
exports.cartSchema = new mongoose_1.Schema({
    // One cart per user, with each item carrying rental dates and quantity.
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [
        {
            plantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Plant', required: true },
            quantity: { type: Number, required: true, min: 1 },
            rentalStartDate: { type: Date, required: true },
            rentalEndDate: { type: Date, required: true },
        },
    ],
}, { timestamps: true });
