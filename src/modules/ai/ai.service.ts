import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '../../utils/AppError';
import {
  GEMINI_IMAGE_MODEL,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_NOT_FOUND,
} from '../../config/constants';
import { IPlant, Plant } from '../plant/plant.model';
import { KNOWLEDGE_BASE } from './knowledgeBase';

interface GeminiInlineDataPart {
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiInlineDataPart[];
  };
}

const geminiApiKey = process.env.GEMINI_API_KEY;

export const askAI = async (message: string): Promise<string> => {
  if (!geminiApiKey) {
    throw new AppError(
      'GEMINI_API_KEY is not configured',
      HTTP_STATUS_INTERNAL_SERVER_ERROR
    );
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  const prompt = `
${KNOWLEDGE_BASE}

User Question:
${message}

Answer naturally and briefly.
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};

export const visualizePlantInSpace = async (
  imageBuffer: Buffer,
  mimeType: string,
  plantId: string
): Promise<{ generatedImage: string; plant: IPlant }> => {
  const plant = await Plant.findById(plantId);

  if (!plant || plant.isDeleted) {
    throw new AppError('Plant not found', HTTP_STATUS_NOT_FOUND);
  }

  if (!geminiApiKey) {
    throw new AppError(
      'GEMINI_API_KEY is not configured',
      HTTP_STATUS_INTERNAL_SERVER_ERROR
    );
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);

  const model = genAI.getGenerativeModel({
    model: GEMINI_IMAGE_MODEL,
  });

  const prompt = `
Generate a realistic interior design visualization.

Insert the plant "${plant.name}" naturally into the uploaded room image.

Requirements:
- Maintain realistic perspective
- Match lighting and shadows
- Preserve room structure
- Place plant naturally on floor/table/balcony depending on scene
- Keep image photorealistic
- Do not alter furniture unnecessarily
- Plant should look naturally integrated into the environment
`;

  const imageInputPart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType,
    },
  };

  const result = await model.generateContent([prompt, imageInputPart]);
  const response = await result.response;
  const candidates = (response.candidates ?? []) as GeminiCandidate[];

  if (candidates.length === 0) {
    throw new AppError(
      'Failed to generate AI visualization',
      HTTP_STATUS_INTERNAL_SERVER_ERROR
    );
  }

  const parts = candidates[0]?.content?.parts ?? [];
  const generatedImagePart = parts.find((part) => part.inlineData?.data);

  if (!generatedImagePart?.inlineData?.data || !generatedImagePart.inlineData.mimeType) {
    throw new AppError(
      'No generated image returned from Gemini',
      HTTP_STATUS_INTERNAL_SERVER_ERROR
    );
  }

  return {
    generatedImage: `data:${generatedImagePart.inlineData.mimeType};base64,${generatedImagePart.inlineData.data}`,
    plant,
  };
};
