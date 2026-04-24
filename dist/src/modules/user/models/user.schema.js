"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSchema = void 0;
const mongoose_1 = require("mongoose");
exports.userSchema = new mongoose_1.Schema({
    // Core identity fields used by both local login and Google sign-in.
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    googleId: { type: String },
    role: {
        type: String,
        enum: ['user', 'super_admin', 'product_admin', 'order_admin', 'delivery_admin', 'user_admin'],
        default: 'user',
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    refreshToken: { type: String },
}, { timestamps: true });
