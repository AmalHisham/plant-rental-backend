import { Request, Response } from 'express';
import {
  getAllPlants,
  getPlantById,
  createPlant,
  updatePlant,
  deletePlant,
} from './plant.service';
import { createPlantSchema, updatePlantSchema, filterSchema } from './plant.validation';

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
