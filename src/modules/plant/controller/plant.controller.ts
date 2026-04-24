import { Request, Response } from 'express';
import Joi from 'joi';
import {
  getAllPlants,
  getPlantById,
  createPlant,
  updatePlant,
  deletePlant,
} from '../service/plant.service';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createPlantSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  category: Joi.string().trim().min(2).max(50).required(),
  description: Joi.string().trim().min(10).max(1000).required(),
  pricePerDay: Joi.number().min(0).required(),
  depositAmount: Joi.number().min(0).required(),
  stock: Joi.number().integer().min(0).required(),
  careLevel: Joi.string().valid('easy', 'medium', 'hard').required(),
  images: Joi.array().items(Joi.string().uri()).default([]),
  isAvailable: Joi.boolean().default(true),
}).required();

// .min(1) on the update schema enforces that at least one field must be sent —
// an empty PATCH body would otherwise pass validation and do nothing silently.
const updatePlantSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  category: Joi.string().trim().min(2).max(50),
  description: Joi.string().trim().min(10).max(1000),
  pricePerDay: Joi.number().min(0),
  depositAmount: Joi.number().min(0),
  stock: Joi.number().integer().min(0),
  careLevel: Joi.string().valid('easy', 'medium', 'hard'),
  images: Joi.array().items(Joi.string().uri()),
  isAvailable: Joi.boolean(),
}).min(1).required();

// Query filter schema — convert: true (passed inline below) coerces string query params
// to the correct types ('true' → true, '12' → 12).
const filterSchema = Joi.object({
  category: Joi.string().trim(),
  careLevel: Joi.string().valid('easy', 'medium', 'hard'),
  isAvailable: Joi.boolean(),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  search: Joi.string().trim(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(12),
});

// ─── Handlers ────────────────────────────────────────────────────────────────

export const getPlants = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = filterSchema.validate(req.query, { convert: true });
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const result = await getAllPlants(value);
  res.status(200).json({ success: true, data: result });
};

export const getPlant = async (req: Request, res: Response): Promise<void> => {
  const plant = await getPlantById(req.params.id as string);
  if (!plant) {
    res.status(404).json({ success: false, message: 'Plant not found' });
    return;
  }
  res.status(200).json({ success: true, data: plant });
};

export const createPlantHandler = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = createPlantSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const plant = await createPlant(value);
  res.status(201).json({ success: true, data: plant });
};

export const updatePlantHandler = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = updatePlantSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const plant = await updatePlant(req.params.id as string, value);
  if (!plant) {
    res.status(404).json({ success: false, message: 'Plant not found' });
    return;
  }
  res.status(200).json({ success: true, data: plant });
};

export const deletePlantHandler = async (req: Request, res: Response): Promise<void> => {
  const plant = await deletePlant(req.params.id as string);
  if (!plant) {
    res.status(404).json({ success: false, message: 'Plant not found' });
    return;
  }
  res.status(200).json({ success: true, message: 'Plant deleted successfully' });
};
