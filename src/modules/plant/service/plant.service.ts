import { Plant, IPlant } from '../models/plant.model';

export interface PlantFilters {
  category?: string;
  careLevel?: string;
  isAvailable?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
}

// ─── Get All (with filters + pagination) ────────────────────────────────────

export const getAllPlants = async (filters: PlantFilters) => {
  const {
    category,
    careLevel,
    isAvailable,
    minPrice,
    maxPrice,
    search,
    page = 1,
    limit = 12,
  } = filters;

  const query: Record<string, any> = { isDeleted: false };

  if (category) query.category = { $regex: category, $options: 'i' };
  if (careLevel) query.careLevel = careLevel;
  if (typeof isAvailable === 'boolean') query.isAvailable = isAvailable;
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.pricePerDay = {};
    if (minPrice !== undefined) query.pricePerDay.$gte = minPrice;
    if (maxPrice !== undefined) query.pricePerDay.$lte = maxPrice;
  }
  if (search) query.$text = { $search: search };

  const skip = (page - 1) * limit;
  const [plants, total] = await Promise.all([
    Plant.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Plant.countDocuments(query),
  ]);

  return {
    plants,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── Get One ─────────────────────────────────────────────────────────────────

export const getPlantById = async (id: string): Promise<IPlant | null> => {
  return Plant.findOne({ _id: id, isDeleted: false });
};

// ─── Create ──────────────────────────────────────────────────────────────────

export const createPlant = async (data: Partial<IPlant>): Promise<IPlant> => {
  return Plant.create(data);
};

// ─── Update ──────────────────────────────────────────────────────────────────

export const updatePlant = async (
  id: string,
  data: Partial<IPlant>
): Promise<IPlant | null> => {
  return Plant.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true });
};

// ─── Delete ──────────────────────────────────────────────────────────────────

export const deletePlant = async (id: string): Promise<IPlant | null> => {
  return Plant.findByIdAndUpdate(id, { isDeleted: true }, { returnDocument: 'after' });
};
