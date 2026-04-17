import { Plant } from '../../plant/models/plant.model';
import { Cart } from '../../cart/models/cart.model';
import { Order, IOrder } from '../models/order.model';
import { AppError } from '../../../utils/AppError';
import mongoose from 'mongoose';

interface CreateOrderInput {
  userId: string;
  plants: { plantId: string; quantity: number }[];
  rentalStartDate: Date;
  rentalEndDate: Date;
  deliveryAddress: string;
  policyAccepted: true;
}

export const createOrder = async (input: CreateOrderInput): Promise<IOrder> => {
  const { userId, plants, rentalStartDate, rentalEndDate, deliveryAddress, policyAccepted } = input;

  const days = Math.ceil(
    (rentalEndDate.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let rentalTotal = 0;
  let deposit = 0;

  for (const item of plants) {
    const plant = await Plant.findById(item.plantId);
    if (!plant || plant.isDeleted) throw new AppError(`Plant not found: ${item.plantId}`, 404);
    if (!plant.isAvailable || plant.stock < item.quantity) {
      throw new AppError(`Insufficient stock for plant: ${plant.name}`, 400);
    }
    rentalTotal += plant.pricePerDay * days * item.quantity;
    deposit += plant.depositAmount * item.quantity;
  }

  const totalPrice = rentalTotal + deposit;

  // Decrement stock
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

export const getOrdersByUser = async (userId: string): Promise<IOrder[]> => {
  return Order.find({ userId, isDeleted: false }).sort({ createdAt: -1 });
};

export const getOrderById = async (orderId: string): Promise<IOrder | null> => {
  return Order.findOne({ _id: orderId, isDeleted: false });
};

export const updateOrderStatus = async (
  orderId: string,
  status: 'booked' | 'delivered' | 'picked'
): Promise<IOrder | null> => {
  return Order.findByIdAndUpdate(orderId, { status }, { returnDocument: 'after' });
};

export const updateDamageStatus = async (
  orderId: string,
  damageStatus: 'none' | 'minor' | 'major'
): Promise<IOrder | null> => {
  return Order.findByIdAndUpdate(orderId, { damageStatus }, { returnDocument: 'after' });
};

export const updateDepositRefund = async (
  orderId: string,
  depositRefunded: boolean
): Promise<IOrder | null> => {
  return Order.findByIdAndUpdate(orderId, { depositRefunded }, { returnDocument: 'after' });
};

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

  await Cart.findOneAndUpdate({ userId }, { items: [] });

  return order;
};
