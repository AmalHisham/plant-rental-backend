"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cart = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const cart_schema_1 = require("./cart.schema");
// Keep the model typed so service code can rely on the cart document shape.
exports.Cart = mongoose_1.default.model('Cart', cart_schema_1.cartSchema);
