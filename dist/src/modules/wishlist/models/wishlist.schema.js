"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wishlistSchema = void 0;
const mongoose_1 = require("mongoose");
exports.wishlistSchema = new mongoose_1.Schema({
    // One wishlist per user keeps the lookup simple and avoids duplicate lists.
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    plants: [
        {
            plantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Plant', required: true },
        },
    ],
}, { timestamps: true });
