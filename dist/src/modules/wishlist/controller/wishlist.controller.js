"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFromWishlistHandler = exports.addToWishlistHandler = exports.getWishlistHandler = void 0;
const joi_1 = __importDefault(require("joi"));
const wishlist_service_1 = require("../service/wishlist.service");
// ─── Validation Schemas ───────────────────────────────────────────────────────
const plantIdParamsSchema = joi_1.default.object({
    plantId: joi_1.default.string().required(),
}).required();
// ─── Handlers ────────────────────────────────────────────────────────────────
const getWishlistHandler = async (req, res) => {
    // Wishlist data belongs to the signed-in user only.
    const wishlist = await (0, wishlist_service_1.getWishlist)(req.user.id);
    res.status(200).json({ success: true, data: { wishlist } });
};
exports.getWishlistHandler = getWishlistHandler;
const addToWishlistHandler = async (req, res) => {
    // Validate the route parameter before the service checks the plant itself.
    const { error, value } = plantIdParamsSchema.validate(req.params);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const wishlist = await (0, wishlist_service_1.addToWishlist)(req.user.id, value.plantId);
    res.status(200).json({ success: true, data: { wishlist } });
};
exports.addToWishlistHandler = addToWishlistHandler;
const removeFromWishlistHandler = async (req, res) => {
    // The same route parameter validation applies when removing a plant.
    const { error, value } = plantIdParamsSchema.validate(req.params);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const wishlist = await (0, wishlist_service_1.removeFromWishlist)(req.user.id, value.plantId);
    res.status(200).json({ success: true, data: { wishlist } });
};
exports.removeFromWishlistHandler = removeFromWishlistHandler;
