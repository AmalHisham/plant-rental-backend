import { Request, Response } from 'express';
import { AppError } from '../../utils/AppError';
import { visualizePlantSchema } from './ai.validation';
import { askAI, visualizePlantInSpace } from './ai.service';
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_OK,
} from '../../config/constants';

export const visualizePlantController = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = visualizePlantSchema.validate(req.body);

  if (error) {
    throw new AppError(error.message, HTTP_STATUS_BAD_REQUEST);
  }

  if (!req.file) {
    throw new AppError('Image is required', HTTP_STATUS_BAD_REQUEST);
  }

  const result = await visualizePlantInSpace(
    req.file.buffer,
    req.file.mimetype,
    value.plantId
  );

  res.status(HTTP_STATUS_OK).json({
    success: true,
    message: 'AI visualization generated successfully',
    data: result,
  });
};

export const chatWithAI = async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body as { message?: string };

  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new AppError('Message is required', HTTP_STATUS_BAD_REQUEST);
  }

  try {
    const reply = await askAI(message.trim());

    res.status(HTTP_STATUS_OK).json({
      success: true,
      reply,
    });
  } catch {
    throw new AppError(
      'Unable to get AI response at the moment. Please try again later.',
      HTTP_STATUS_INTERNAL_SERVER_ERROR
    );
  }
};
