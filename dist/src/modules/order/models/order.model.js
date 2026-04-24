"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const order_schema_1 = require("./order.schema");
// Typed model wrapper for the order schema.
exports.Order = mongoose_1.default.model('Order', order_schema_1.orderSchema);
