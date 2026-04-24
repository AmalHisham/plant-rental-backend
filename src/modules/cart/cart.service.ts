import mongoose from 'mongoose';
import { Cart } from './models/cart.model';
import { Plant, IPlant } from '../plant/models/plant.model';
import { AppError } from '../../utils/AppError';

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

// Rounds up partial days so a 25-hour rental is charged as 2 days.
const computeRentalDays = (start: Date, end: Date): number =>
  Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

// Only the fields needed to display cart items and compute prices are fetched —
// avoids pulling heavy fields (like description) on every cart GET.
const PLANT_SELECT = 'name category pricePerDay depositAmount careLevel images isAvailable stock';

// Centralised plant validation used by both addItem and updateItem so the check
// is never skipped. Throws AppError so catchAsync propagates it correctly.
const validatePlant = async (plantId: string, quantity: number): Promise<IPlant> => {
  const plant = await Plant.findOne({ _id: plantId, isDeleted: false, isAvailable: true });
  if (!plant) throw new AppError('Plant not found or unavailable', 404);
  if (plant.stock < quantity)
    throw new AppError(`Insufficient stock. Only ${plant.stock} unit(s) available`, 400);
  return plant;
};

// ─── Get Cart ─────────────────────────────────────────────────────────────────

export const getCart = async (userId: string) => {
  // .populate() replaces the plantId ObjectId with the actual plant document fields
  // so the client receives enriched cart items without a second API call.
  const cart = await Cart.findOne({ userId }).populate('items.plantId', PLANT_SELECT);

  // Return an empty cart shape (not a 404) so the frontend always has a consistent structure.
  if (!cart) return { userId, items: [], cartTotal: 0 };

  const items = cart.items.map((item) => {
    const plant = item.plantId as unknown as IPlant; // populated, so safe to cast
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
  await validatePlant(input.plantId, input.quantity); // stock check before any write

  let cart = await Cart.findOne({ userId });

  if (!cart) {
    // First item — create the cart document with this item as the initial array entry.
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

  // Duplicate plant guard — the same plant can only appear once per cart.
  // Use PUT /api/cart/items/:plantId to change quantity or dates for an existing item.
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

  // Merge the incoming values with current values before validating the final range.
  // This handles the case where only one date is updated — the other stays unchanged.
  const finalStart = input.rentalStartDate ?? item.rentalStartDate;
  const finalEnd = input.rentalEndDate ?? item.rentalEndDate;
  if (finalEnd <= finalStart)
    throw new AppError('Rental end date must be after start date', 400);

  // Only mutate the fields that were explicitly provided in the request.
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
  // Filter out the matching item by comparing ObjectId as string.
  cart.items = cart.items.filter((i) => i.plantId.toString() !== plantId);

  // If length didn't change, the plant was never in the cart.
  if (cart.items.length === before) throw new AppError('Plant not in cart', 400);

  await cart.save();
  return getCart(userId);
};

// ─── Clear Cart ───────────────────────────────────────────────────────────────

export const clearCart = async (userId: string): Promise<void> => {
  // Reset items to an empty array — the cart document itself is kept so the userId
  // index is preserved and the next add doesn't need to create a new document.
  await Cart.findOneAndUpdate({ userId }, { items: [] });
};
