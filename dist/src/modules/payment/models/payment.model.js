"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const payment_schema_1 = require("./payment.schema");
// Typed payment model used by the service layer.
exports.Payment = mongoose_1.default.model('Payment', payment_schema_1.paymentSchema);
