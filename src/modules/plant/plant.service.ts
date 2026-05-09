import { UploadApiResponse } from 'cloudinary';
import cloudinary from '../../utils/cloudinary';
import { AppError } from '../../utils/AppError';
import { Plant, IPlant } from './plant.model';

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

// ─── Upload Images ────────────────────────────────────────────────────────────

// Uploads each buffer to Cloudinary concurrently and appends the resulting secure
// URLs to the plant's images array. Caps the total at 10 images per plant.
export const uploadPlantImages = async (
  id: string,
  buffers: Buffer[]
): Promise<IPlant> => {
  const plant = await Plant.findOne({ _id: id, isDeleted: false });
  if (!plant) throw new AppError('Plant not found', 404);

  const MAX_IMAGES = 10;
  const slots = MAX_IMAGES - plant.images.length;
  if (slots <= 0) throw new AppError('Plant already has the maximum of 10 images', 400);
  if (buffers.length > slots)
    throw new AppError(`Only ${slots} more image(s) can be added to this plant`, 400);

  // Upload all buffers in parallel — each buffer is piped into a Cloudinary upload_stream.
  const urls = await Promise.all(
    buffers.map(
      (buf) =>
        new Promise<string>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'plant-rental/plants', resource_type: 'image' },
            (err, result: UploadApiResponse | undefined) => {
              if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
              resolve(result.secure_url);
            }
          );
          stream.end(buf);
        })
    )
  );

  plant.images.push(...urls);
  await plant.save();
  return plant;
};

// ─── Delete Image ─────────────────────────────────────────────────────────────

// Derives the Cloudinary public_id from the stored URL and destroys the asset,
// then removes the URL from the plant's images array.
export const deletePlantImage = async (id: string, imageUrl: string): Promise<IPlant> => {
  const plant = await Plant.findOne({ _id: id, isDeleted: false });
  if (!plant) throw new AppError('Plant not found', 404);

  if (!plant.images.includes(imageUrl))
    throw new AppError('Image not found on this plant', 404);

  // Cloudinary public_id is the path segment between the upload root and the file
  // extension, e.g. "plant-rental/plants/abc123" from a full secure_url.
  const urlParts = imageUrl.split('/');
  const fileWithExt = urlParts[urlParts.length - 1];
  const fileName = fileWithExt.split('.')[0];
  const folder = urlParts.slice(urlParts.indexOf('plant-rental')).slice(0, -1).join('/');
  const publicId = `${folder}/${fileName}`;

  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });

  plant.images = plant.images.filter((img) => img !== imageUrl);
  await plant.save();
  return plant;
};
