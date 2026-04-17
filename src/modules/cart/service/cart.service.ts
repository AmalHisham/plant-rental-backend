import mongoose from 'mongoose';
import { Cart } from '../models/cart.model';
import { Plant, IPlant } from '../../plant/models/plant.model';
import { AppError } from '../../../utils/AppError';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddItemInput {
  plantId: string;
  quantity: number;
  rentalStartDate: Date;
  rentalEndDate: Date;
}

interface UpdateItemInput {
  quantity?: number;
  rentalStartDate?: Date;
  rentalEndDate?: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const computeRentalDays = (start: Date, end: Date): number =>
  Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

const PLANT_SELECT = 'name category pricePerDay depositAmount careLevel images isAvailable stock';

const validatePlant = async (plantId: string, quantity: number): Promise<IPlant> => {
  const plant = await Plant.findOne({ _id: plantId, isDeleted: false, isAvailable: true });
  if (!plant) throw new AppError('Plant not found or unavailable', 404);
  if (plant.stock < quantity)
    throw new AppError(`Insufficient stock. Only ${plant.stock} unit(s) available`, 400);
  return plant;
};

// ─── Get Cart ─────────────────────────────────────────────────────────────────

export const getCart = async (userId: string) => {
  const cart = await Cart.findOne({ userId }).populate('items.plantId', PLANT_SELECT);
  if (!cart) return { userId, items: [], cartTotal: 0 };

  const items = cart.items.map((item) => {
    const plant = item.plantId as unknown as IPlant;
    const rentalDays = computeRentalDays(item.rentalStartDate, item.rentalEndDate);
    const rentalTotal = plant.pricePerDay * rentalDays * item.quantity;
    const deposit = plant.depositAmount * item.quantity;
    return {
      plantId: plant,
      quantity: item.quantity,
      rentalStartDate: item.rentalStartDate,
      rentalEndDate: item.rentalEndDate,
      rentalDays,
      rentalTotal,
      deposit,
      itemTotal: rentalTotal + deposit,
    };
  });

  const cartTotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
  return { _id: cart._id, userId: cart.userId, items, cartTotal };
};

// ─── Add Item ─────────────────────────────────────────────────────────────────

export const addItem = async (userId: string, input: AddItemInput) => {
  await validatePlant(input.plantId, input.quantity);

  let cart = await Cart.findOne({ userId });

  if (!cart) {
    await Cart.create({
      userId,
      items: [
        {
          plantId: input.plantId,
          quantity: input.quantity,
          rentalStartDate: input.rentalStartDate,
          rentalEndDate: input.rentalEndDate,
        },
      ],
    });
    return getCart(userId);
  }

  const alreadyInCart = cart.items.some((i) => i.plantId.toString() === input.plantId);
  if (alreadyInCart)
    throw new AppError('Plant already in cart. Use PUT /api/cart/items/:plantId to update', 400);

  cart.items.push({
    plantId: new mongoose.Types.ObjectId(input.plantId),
    quantity: input.quantity,
    rentalStartDate: input.rentalStartDate,
    rentalEndDate: input.rentalEndDate,
  });
  await cart.save();
  return getCart(userId);
};

// ─── Update Item ──────────────────────────────────────────────────────────────

export const updateItem = async (userId: string, plantId: string, input: UpdateItemInput) => {
  const cart = await Cart.findOne({ userId });
  if (!cart) throw new AppError('Plant not in cart', 404);

  const item = cart.items.find((i) => i.plantId.toString() === plantId);
  if (!item) throw new AppError('Plant not in cart', 404);

  const newQuantity = input.quantity ?? item.quantity;
  await validatePlant(plantId, newQuantity);

  // Validate final date range using merged values
  const finalStart = input.rentalStartDate ?? item.rentalStartDate;
  const finalEnd = input.rentalEndDate ?? item.rentalEndDate;
  if (finalEnd <= finalStart)
    throw new AppError('Rental end date must be after start date', 400);

  if (input.quantity !== undefined) item.quantity = input.quantity;
  if (input.rentalStartDate !== undefined) item.rentalStartDate = input.rentalStartDate;
  if (input.rentalEndDate !== undefined) item.rentalEndDate = input.rentalEndDate;

  await cart.save();
  return getCart(userId);
};

// ─── Remove Item ──────────────────────────────────────────────────────────────

export const removeItem = async (userId: string, plantId: string) => {
  const cart = await Cart.findOne({ userId });
  if (!cart) throw new AppError('Plant not in cart', 400);

  const before = cart.items.length;
  cart.items = cart.items.filter((i) => i.plantId.toString() !== plantId);
  if (cart.items.length === before) throw new AppError('Plant not in cart', 400);

  await cart.save();
  return getCart(userId);
};

// ─── Clear Cart ───────────────────────────────────────────────────────────────

export const clearCart = async (userId: string): Promise<void> => {
  await Cart.findOneAndUpdate({ userId }, { items: [] });
};
