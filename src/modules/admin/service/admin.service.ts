import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, UserRole } from '../../user/models/user.model';
import { Plant } from '../../plant/models/plant.model';
import { Order } from '../../order/models/order.model';
import { AppError } from '../../../utils/AppError';
import { sendAdminWelcomeEmail } from '../../user/service/email.service';

const generateRandomPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(12);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
};

export const getDashboardStats = async () => {
  const [
    totalUsers,
    totalPlants,
    totalOrders,
    revenueResult,
    bookedCount,
    deliveredCount,
    pickedCount,
    recentOrders,
    lowStockPlants,
    topPlants,
  ] = await Promise.all([
    User.countDocuments({ isDeleted: false }),
    Plant.countDocuments({ isDeleted: false }),
    Order.countDocuments({ isDeleted: false }),
    Order.aggregate([
      { $match: { paymentStatus: 'paid', isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
    Order.countDocuments({ status: 'booked', isDeleted: false }),
    Order.countDocuments({ status: 'delivered', isDeleted: false }),
    Order.countDocuments({ status: 'picked', isDeleted: false }),
    Order.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email')
      .populate('plants.plantId', 'name category'),
    Plant.find({ stock: { $lt: 5 }, isDeleted: false }).select('name stock category'),
    Order.aggregate([
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

interface GetAllOrdersFilters {
  status?: 'booked' | 'delivered' | 'picked';
  damageStatus?: 'none' | 'minor' | 'major';
  paymentStatus?: 'pending' | 'paid' | 'failed';
  userId?: string;
  page: number;
  limit: number;
  startDate?: Date;
  endDate?: Date;
}

export const getAllOrdersAdmin = async (filters: GetAllOrdersFilters) => {
  const { status, damageStatus, paymentStatus, userId, page, limit, startDate, endDate } = filters;

  const query: Record<string, unknown> = { isDeleted: false };
  if (status) query.status = status;
  if (damageStatus) query.damageStatus = damageStatus;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (userId) query.userId = new mongoose.Types.ObjectId(userId);
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;
    query.rentalStartDate = dateFilter;
  }

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('plants.plantId', 'name category'),
    Order.countDocuments(query),
  ]);

  return { orders, total, page, totalPages: Math.ceil(total / limit) };
};

export const createAdminUser = async (name: string, email: string, role: UserRole) => {
  if (role === 'user') throw new AppError('Cannot create admin with role "user"', 400);

  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already in use', 409);

  const password = generateRandomPassword();
  const hashed = await bcrypt.hash(password, 12);

  const user = await User.create({ name, email, password: hashed, role });

  await sendAdminWelcomeEmail(email, name, password, role);

  return { _id: user._id, name: user.name, email: user.email, role: user.role };
};
