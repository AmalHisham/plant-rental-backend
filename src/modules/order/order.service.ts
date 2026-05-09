import { Plant } from '../plant/plant.model';
import { Cart } from '../cart/cart.model';
import { Order, IOrder } from './order.model';
import { AppError } from '../../utils/AppError';
import mongoose from 'mongoose';

interface CreateOrderInput {
  userId: string;
  plants: { plantId: string; quantity: number }[];
  rentalStartDate: Date;
  rentalEndDate: Date;
  deliveryAddress: string;
  policyAccepted: true;
}

// ─── Create Order (direct) ───────────────────────────────────────────────────
// Used when the client sends the order payload directly (not from a saved cart).
export const createOrder = async (input: CreateOrderInput): Promise<IOrder> => {
  const { userId, plants, rentalStartDate, rentalEndDate, deliveryAddress, policyAccepted } = input;

  // Rental duration in whole days, rounded up so a 1.5-day rental charges 2 days.
  const days = Math.ceil(
    (rentalEndDate.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let rentalTotal = 0;
  let deposit = 0;

  // First pass: validate every plant and compute totals before touching stock.
  // If any plant fails validation we throw before any stock is decremented,
  // keeping the DB consistent without needing a transaction.
  for (const item of plants) {
    const plant = await Plant.findById(item.plantId);
    if (!plant || plant.isDeleted) throw new AppError(`Plant not found: ${item.plantId}`, 404);
    if (!plant.isAvailable || plant.stock < item.quantity) {
      throw new AppError(`Insufficient stock for plant: ${plant.name}`, 400);
    }
    rentalTotal += plant.pricePerDay * days * item.quantity;
    // deposit = depositAmount × quantity — stored separately for refund tracking
    deposit += plant.depositAmount * item.quantity;
  }

  const totalPrice = rentalTotal + deposit;

  // Second pass: decrement stock only after every plant has passed validation.
  // $inc is an atomic MongoDB operation — safer than read-modify-write in the app layer.
  for (const item of plants) {
    await Plant.findByIdAndUpdate(item.plantId, { $inc: { stock: -item.quantity } });
  }

  const order = await Order.create({
    userId: new mongoose.Types.ObjectId(userId),
    plants: plants.map((p) => ({
      plantId: new mongoose.Types.ObjectId(p.plantId),
      quantity: p.quantity,
    })),
    rentalStartDate,
    rentalEndDate,
    totalPrice,
    deposit,
    deliveryAddress,
    policyAccepted,
  });

  return order;
};

// ─── Get Orders by User ───────────────────────────────────────────────────────

export const getOrdersByUser = async (
  userId: string,
  page: number,
  limit: number
): Promise<{ orders: IOrder[]; total: number; totalPages: number; page: number }> => {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find({ userId, isDeleted: false })
      .populate('plants.plantId', 'name category images pricePerDay depositAmount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments({ userId, isDeleted: false }),
  ]);
  return { orders, total, totalPages: Math.ceil(total / limit), page };
};

// ─── Get Order By ID ──────────────────────────────────────────────────────────

export const getOrderById = async (orderId: string): Promise<IOrder | null> => {
  return Order.findOne({ _id: orderId, isDeleted: false })
    .populate('plants.plantId', 'name category images pricePerDay depositAmount');
};

// ─── Update Order Status ──────────────────────────────────────────────────────
// Controls the physical delivery lifecycle: booked → delivered → picked.

export const updateOrderStatus = async (
  orderId: string,
  status: 'booked' | 'delivered' | 'picked'
): Promise<IOrder | null> => {
  return Order.findByIdAndUpdate(orderId, { status }, { returnDocument: 'after' });
};

// ─── Update Damage Status ─────────────────────────────────────────────────────
// Set by order admin after the plant is returned and inspected.

export const updateDamageStatus = async (
  orderId: string,
  damageStatus: 'none' | 'minor' | 'major'
): Promise<IOrder | null> => {
  return Order.findByIdAndUpdate(orderId, { damageStatus }, { returnDocument: 'after' });
};

// ─── Update Deposit Refund ────────────────────────────────────────────────────
// Tracks whether the deposit was actually returned to the customer.
// Kept separate from damageStatus so finance can mark refunds independently of ops.

export const updateDepositRefund = async (
  orderId: string,
  depositRefunded: boolean
): Promise<IOrder | null> => {
  return Order.findByIdAndUpdate(orderId, { depositRefunded }, { returnDocument: 'after' });
};

// ─── Checkout From Cart ───────────────────────────────────────────────────────
// Converts the user's saved cart into an order.
// The rental window of the resulting order spans from the earliest start date to the
// latest end date across all cart items.

export const checkoutFromCart = async (
  userId: string,
  deliveryAddress: string,
  policyAccepted: true
): Promise<IOrder> => {
  const cart = await Cart.findOne({ userId });
  if (!cart || cart.items.length === 0) throw new AppError('Cart is empty', 400);

  let rentalTotal = 0;
  let deposit = 0;
  let minStart = cart.items[0].rentalStartDate;
  let maxEnd = cart.items[0].rentalEndDate;

  // Each item is re-validated at checkout time because the cart may have been stale
  // (another user could have bought the last unit between add-to-cart and checkout).
  for (const item of cart.items) {
    const plant = await Plant.findById(item.plantId);
    if (!plant || plant.isDeleted) throw new AppError(`Plant not found: ${item.plantId}`, 404);
    if (!plant.isAvailable || plant.stock < item.quantity) {
      throw new AppError(`Insufficient stock for plant: ${plant.name}`, 400);
    }
    const days = Math.ceil(
      (item.rentalEndDate.getTime() - item.rentalStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    rentalTotal += plant.pricePerDay * days * item.quantity;
    deposit += plant.depositAmount * item.quantity;

    // Track the overall rental window of the entire cart order.
    if (item.rentalStartDate < minStart) minStart = item.rentalStartDate;
    if (item.rentalEndDate > maxEnd) maxEnd = item.rentalEndDate;
  }

  const totalPrice = rentalTotal + deposit;

  for (const item of cart.items) {
    await Plant.findByIdAndUpdate(item.plantId, { $inc: { stock: -item.quantity } });
  }

  const order = await Order.create({
    userId: new mongoose.Types.ObjectId(userId),
    plants: cart.items.map((item) => ({
      plantId: item.plantId,
      quantity: item.quantity,
    })),
    rentalStartDate: minStart,
    rentalEndDate: maxEnd,
    totalPrice,
    deposit,
    deliveryAddress,
    policyAccepted,
  });

  // Clear the cart after a successful order so the user starts fresh.
  await Cart.findOneAndUpdate({ userId }, { items: [] });

  return order;
};
