import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware';
import { upload } from '../../middlewares/upload.middleware';
import { catchAsync } from '../../utils/catchAsync';
import { chatWithAI, visualizePlantController } from './ai.controller';

const router = Router();

router.post('/chat', catchAsync(chatWithAI));
router.post('/visualize', protect, upload.single('image'), catchAsync(visualizePlantController));

export default router;
