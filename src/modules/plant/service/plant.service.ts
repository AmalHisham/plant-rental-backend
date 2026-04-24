import { Plant, IPlant } from '../models/plant.model';

// PlantFilters defines the shape of query parameters accepted by the list endpoint.
// Every field is optional — the controller populates this from req.query after Joi validation.
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

  // Start with the mandatory soft-delete filter; add optional filters only when provided
  // so omitted filters don't appear as { key: undefined } conditions in the Mongo query.
  const query: Record<string, any> = { isDeleted: false };

  // $regex with $options: 'i' allows partial, case-insensitive category matching
  // (e.g. 'tropical' matches 'Tropical Plants').
  if (category) query.category = { $regex: category, $options: 'i' };
  if (careLevel) query.careLevel = careLevel;
  if (typeof isAvailable === 'boolean') query.isAvailable = isAvailable;

  // Build a range filter for pricePerDay when either or both bounds are specified.
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.pricePerDay = {};
    if (minPrice !== undefined) query.pricePerDay.$gte = minPrice;
    if (maxPrice !== undefined) query.pricePerDay.$lte = maxPrice;
  }

  // Name search uses a regex rather than the $text index to keep it simple and avoid
  // the need for a specific text search query object structure.
  if (search) query.name = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;

  // Run find + countDocuments in parallel to avoid two sequential round-trips.
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
  // runValidators: true re-runs Mongoose schema validators on the updated fields
  // (e.g. ensures careLevel is still one of 'easy'|'medium'|'hard' after a partial update).
  return Plant.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true });
};

// ─── Delete (soft) ───────────────────────────────────────────────────────────

export const deletePlant = async (id: string): Promise<IPlant | null> => {
  // Soft delete preserves the document so existing order records that reference
  // this plant ID still resolve correctly in order history views.
  return Plant.findByIdAndUpdate(id, { isDeleted: true }, { returnDocument: 'after' });
};
