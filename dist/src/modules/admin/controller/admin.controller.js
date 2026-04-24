"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminHandler = exports.getAllOrdersAdminHandler = exports.getDashboardStatsHandler = void 0;
const joi_1 = __importDefault(require("joi"));
const admin_service_1 = require("../service/admin.service");
const getAllOrdersAdminSchema = joi_1.default.object({
    status: joi_1.default.string().valid('booked', 'delivered', 'picked'),
    damageStatus: joi_1.default.string().valid('none', 'minor', 'major'),
    paymentStatus: joi_1.default.string().valid('pending', 'paid', 'failed'),
    userId: joi_1.default.string().length(24),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
    startDate: joi_1.default.date(),
    endDate: joi_1.default.date(),
});
const createAdminSchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(2).max(100).required(),
    email: joi_1.default.string().email({ tlds: { allow: false } }).lowercase().required(),
    role: joi_1.default.string()
        .valid('super_admin', 'product_admin', 'order_admin', 'delivery_admin', 'user_admin')
        .required()
        .messages({ 'any.only': 'Role must be a valid admin role (not "user")' }),
}).required();
const getDashboardStatsHandler = async (_req, res) => {
    // The dashboard payload is computed centrally so the admin screen stays thin.
    const stats = await (0, admin_service_1.getDashboardStats)();
    res.status(200).json({ success: true, data: stats });
};
exports.getDashboardStatsHandler = getDashboardStatsHandler;
const getAllOrdersAdminHandler = async (req, res) => {
    // Validate all admin filters before querying the paginated order list.
    const { error, value } = getAllOrdersAdminSchema.validate(req.query, { convert: true });
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const result = await (0, admin_service_1.getAllOrdersAdmin)(value);
    res.status(200).json({ success: true, data: result });
};
exports.getAllOrdersAdminHandler = getAllOrdersAdminHandler;
const createAdminHandler = async (req, res) => {
    // Provisioning an admin sends a temporary password through email.
    const { error, value } = createAdminSchema.validate(req.body, { abortEarly: false });
    if (error) {
        res.status(400).json({ success: false, message: error.details.map((d) => d.message) });
        return;
    }
    const user = await (0, admin_service_1.createAdminUser)(value.name, value.email, value.role);
    res.status(201).json({ success: true, data: user });
};
exports.createAdminHandler = createAdminHandler;
