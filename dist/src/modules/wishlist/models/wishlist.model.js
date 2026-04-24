"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wishlist = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const wishlist_schema_1 = require("./wishlist.schema");
// Typed wishlist model so services can work with populated plant references.
exports.Wishlist = mongoose_1.default.model('Wishlist', wishlist_schema_1.wishlistSchema);
