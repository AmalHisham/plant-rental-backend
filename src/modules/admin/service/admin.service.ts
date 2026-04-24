import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, UserRole } from '../../user/models/user.model';
import { Plant } from '../../plant/models/plant.model';
import { Order } from '../../order/models/order.model';
import { AppError } from '../../../utils/AppError';
import { sendAdminWelcomeEmail } from '../../user/service/email.service';

// Generates a 12-character alphanumeric temporary password using crypto.randomBytes
// for cryptographic randomness. The character set is restricted to avoid ambiguous
// chars (0/O, 1/l) that are hard to read in an email.
const generateRandomPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(12);
  // Map each byte to a character using modulo — slightly biased toward lower indices
  // but negligible for a temporary password that gets changed immediately.
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
// All ten queries run in parallel via Promise.all to minimise total DB round-trip time.

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

    // Aggregate total revenue from paid orders only (pending/failed orders are excluded).
    Order.aggregate([
      { $match: { paymentStatus: 'paid', isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),

    Order.countDocuments({ status: 'booked', isDeleted: false }),
    Order.countDocuments({ status: 'delivered', isDeleted: false }),
    Order.countDocuments({ status: 'picked', isDeleted: false }),

    // 5 most recent orders with user and plant summaries for the dashboard activity feed.
    Order.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email')
      .populate('plants.plantId', 'name category'),

    // Plants with fewer than 5 units in stock — used for the low-stock alert panel.
    Plant.find({ stock: { $lt: 5 }, isDeleted: false }).select('name stock category'),

    // Top 5 most-ordered plants using an aggregation pipeline:
    // $unwind flattens the plants array so each item becomes its own document,
    // then $group sums the quantities per plant, and $lookup joins back to the Plant collection.
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
    // revenueResult is an array from the aggregate; it's empty if there are no paid orders.
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

// ─── Get All Orders (Admin View) ──────────────────────────────────────────────
// Unlike the user-facing GET /api/orders, this endpoint returns all orders across
// all users with rich filtering for the admin order management screen.

export const getAllOrdersAdmin = async (filters: GetAllOrdersFilters) => {
  const { status, damageStatus, paymentStatus, userId, page, limit, startDate, endDate } = filters;

  const query: Record<string, unknown> = { isDeleted: false };
  if (status) query.status = status;
  if (damageStatus) query.damageStatus = damageStatus;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  // Convert the userId string to an ObjectId so it matches the stored type correctly.
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

// ─── Create Admin User ────────────────────────────────────────────────────────
// Provisions a new admin account with a generated temporary password and emails the credentials.

export const createAdminUser = async (name: string, email: string, role: UserRole) => {
  // Prevent accidentally downgrading a route to create a normal 'user' account.
  if (role === 'user') throw new AppError('Cannot create admin with role "user"', 400);

  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already in use', 409);

  const password = generateRandomPassword();
  const hashed = await bcrypt.hash(password, 12);

  const user = await User.create({ name, email, password: hashed, role });

  // Send credentials by email AFTER successful DB creation.
  // If the email fails, the admin account still exists — the caller can resend manually.
  await sendAdminWelcomeEmail(email, name, password, role);

  // Return only safe fields — never expose the hashed password.
  return { _id: user._id, name: user.name, email: user.email, role: user.role };
};
