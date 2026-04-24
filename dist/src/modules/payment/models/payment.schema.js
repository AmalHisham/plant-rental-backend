"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentSchema = void 0;
const mongoose_1 = require("mongoose");
exports.paymentSchema = new mongoose_1.Schema({
    // Payment rows mirror the Razorpay lifecycle for later reconciliation.
    orderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Order', required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
}, { timestamps: true });
