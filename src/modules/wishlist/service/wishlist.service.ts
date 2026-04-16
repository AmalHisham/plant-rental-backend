import mongoose from 'mongoose';
import { Wishlist } from '../models/wishlist.model';
import { Plant } from '../../plant/models/plant.model';
import { AppError } from '../../../utils/AppError';

const PLANT_POPULATE_SELECT =
  'name category pricePerDay depositAmount careLevel images isAvailable stock';

// ─── Get Wishlist ─────────────────────────────────────────────────────────────

export const getWishlist = async (userId: string) => {
  const wishlist = await Wishlist.findOne({ userId }).populate(
    'plants.plantId',
    PLANT_POPULATE_SELECT
  );
  // Return a consistent shape even when no wishlist document exists yet
  return wishlist ?? { userId, plants: [] };
};

// ─── Add To Wishlist ──────────────────────────────────────────────────────────

export const addToWishlist = async (userId: string, plantId: string) => {
  const plant = await Plant.findOne({ _id: plantId, isDeleted: false, isAvailable: true });
  if (!plant) throw new AppError('Plant not found or unavailable', 404);

  let wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    wishlist = await Wishlist.create({ userId, plants: [{ plantId }] });
    return wishlist.populate('plants.plantId', PLANT_POPULATE_SELECT);
  }

  const alreadyAdded = wishlist.plants.some(
    (p) => p.plantId.toString() === plantId
  );
  if (alreadyAdded) throw new AppError('Plant already in wishlist', 400);

  wishlist.plants.push({ plantId: new mongoose.Types.ObjectId(plantId) });
  await wishlist.save();
  return wishlist.populate('plants.plantId', PLANT_POPULATE_SELECT);
};

// ─── Remove From Wishlist ─────────────────────────────────────────────────────

export const removeFromWishlist = async (userId: string, plantId: string) => {
  const wishlist = await Wishlist.findOne({ userId });
  if (!wishlist) throw new AppError('Plant not in wishlist', 400);

  const before = wishlist.plants.length;
  wishlist.plants = wishlist.plants.filter(
    (p) => p.plantId.toString() !== plantId
  );
  if (wishlist.plants.length === before) throw new AppError('Plant not in wishlist', 400);

  await wishlist.save();
  return wishlist.populate('plants.plantId', PLANT_POPULATE_SELECT);
};
