import { Request, Response } from 'express';
import {
  getAllPlants,
  getPlantById,
  createPlant,
  updatePlant,
  deletePlant,
  uploadPlantImages,
  deletePlantImage,
} from './plant.service';
import { createPlantSchema, updatePlantSchema, filterSchema, plantParamsSchema, deleteImageSchema } from './plant.validation';

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
  const { error, value } = plantParamsSchema.validate(req.params);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const plant = await getPlantById(value.id);
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
  const { error: paramsError, value: params } = plantParamsSchema.validate(req.params);
  if (paramsError) {
    res.status(400).json({ success: false, message: paramsError.details[0].message });
    return;
  }
  const { error, value } = updatePlantSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const plant = await updatePlant(params.id, value);
  if (!plant) {
    res.status(404).json({ success: false, message: 'Plant not found' });
    return;
  }
  res.status(200).json({ success: true, data: plant });
};

export const deletePlantHandler = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = plantParamsSchema.validate(req.params);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const plant = await deletePlant(value.id);
  if (!plant) {
    res.status(404).json({ success: false, message: 'Plant not found' });
    return;
  }
  res.status(200).json({ success: true, message: 'Plant deleted successfully' });
};

export const uploadImagesHandler = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = plantParamsSchema.validate(req.params);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }

  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    res.status(400).json({ success: false, message: 'At least one image file is required' });
    return;
  }

  const buffers = files.map((f) => f.buffer);
  const plant = await uploadPlantImages(value.id, buffers);
  res.status(200).json({ success: true, data: plant });
};

export const deleteImageHandler = async (req: Request, res: Response): Promise<void> => {
  const { error: paramsError, value: params } = plantParamsSchema.validate(req.params);
  if (paramsError) {
    res.status(400).json({ success: false, message: paramsError.details[0].message });
    return;
  }

  const { error, value } = deleteImageSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }

  const plant = await deletePlantImage(params.id, value.imageUrl);
  res.status(200).json({ success: true, data: plant });
};
