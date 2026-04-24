"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminUser = exports.getAllOrdersAdmin = exports.getDashboardStats = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = require("../../user/models/user.model");
const plant_model_1 = require("../../plant/models/plant.model");
const order_model_1 = require("../../order/models/order.model");
const AppError_1 = require("../../../utils/AppError");
const email_service_1 = require("../../user/service/email.service");
const generateRandomPassword = () => {
    // Use a restricted character set so the generated password is easy to type and still random.
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto_1.default.randomBytes(12);
    return Array.from(bytes)
        .map((b) => chars[b % chars.length])
        .join('');
};
const getDashboardStats = async () => {
    // These independent queries run in parallel to keep the dashboard responsive.
    const [totalUsers, totalPlants, totalOrders, revenueResult, bookedCount, deliveredCount, pickedCount, recentOrders, lowStockPlants, topPlants,] = await Promise.all([
        user_model_1.User.countDocuments({ isDeleted: false }),
        plant_model_1.Plant.countDocuments({ isDeleted: false }),
        order_model_1.Order.countDocuments({ isDeleted: false }),
        order_model_1.Order.aggregate([
            { $match: { paymentStatus: 'paid', isDeleted: false } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } },
        ]),
        order_model_1.Order.countDocuments({ status: 'booked', isDeleted: false }),
        order_model_1.Order.countDocuments({ status: 'delivered', isDeleted: false }),
        order_model_1.Order.countDocuments({ status: 'picked', isDeleted: false }),
        order_model_1.Order.find({ isDeleted: false })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'name email')
            .populate('plants.plantId', 'name category'),
        plant_model_1.Plant.find({ stock: { $lt: 5 }, isDeleted: false }).select('name stock category'),
        order_model_1.Order.aggregate([
            { $match: { isDeleted: false } },
            { $unwind: '$plants' },
            { $group: { _id: '$plants.plantId', totalOrdered: { $sum: '$plants.quantity' } } },
            { $sort: { totalOrdered: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'plants',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'plant',
                },
            },
            { $unwind: '$plant' },
            {
                $project: {
                    _id: 0,
                    plantId: '$_id',
                    name: '$plant.name',
                    category: '$plant.category',
                    totalOrdered: 1,
                },
            },
        ]),
    ]);
    return {
        totalUsers,
        totalPlants,
        totalOrders,
        totalRevenue: revenueResult[0]?.total ?? 0,
        ordersByStatus: {
            booked: bookedCount,
            delivered: deliveredCount,
            picked: pickedCount,
        },
        recentOrders,
        lowStockPlants,
        topPlants,
    };
};
exports.getDashboardStats = getDashboardStats;
const getAllOrdersAdmin = async (filters) => {
    // Build the admin query from optional filters, then page and populate the result.
    const { status, damageStatus, paymentStatus, userId, page, limit, startDate, endDate } = filters;
    const query = { isDeleted: false };
    if (status)
        query.status = status;
    if (damageStatus)
        query.damageStatus = damageStatus;
    if (paymentStatus)
        query.paymentStatus = paymentStatus;
    if (userId)
        query.userId = new mongoose_1.default.Types.ObjectId(userId);
    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate)
            dateFilter.$gte = startDate;
        if (endDate)
            dateFilter.$lte = endDate;
        query.rentalStartDate = dateFilter;
    }
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
        order_model_1.Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name email')
            .populate('plants.plantId', 'name category'),
        order_model_1.Order.countDocuments(query),
    ]);
    return { orders, total, page, totalPages: Math.ceil(total / limit) };
};
exports.getAllOrdersAdmin = getAllOrdersAdmin;
const createAdminUser = async (name, email, role) => {
    // Create the admin account with a generated password and notify the new admin by email.
    if (role === 'user')
        throw new AppError_1.AppError('Cannot create admin with role "user"', 400);
    const existing = await user_model_1.User.findOne({ email });
    if (existing)
        throw new AppError_1.AppError('Email already in use', 409);
    const password = generateRandomPassword();
    const hashed = await bcryptjs_1.default.hash(password, 12);
    const user = await user_model_1.User.create({ name, email, password: hashed, role });
    await (0, email_service_1.sendAdminWelcomeEmail)(email, name, password, role);
    return { _id: user._id, name: user.name, email: user.email, role: user.role };
};
exports.createAdminUser = createAdminUser;
