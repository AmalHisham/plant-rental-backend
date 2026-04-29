import multer from 'multer';
import { AppError } from '../utils/AppError';
import { Request } from 'express';

// memoryStorage keeps the file in RAM as a Buffer so we can pipe it straight to
// Cloudinary's upload_stream — no temp files written to disk.
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new AppError('Only image files are allowed', 400));
    return;
  }
  cb(null, true);
};

// 5 MB per file — large enough for high-res plant photos, small enough to keep
// upload times reasonable and prevent abuse.
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
