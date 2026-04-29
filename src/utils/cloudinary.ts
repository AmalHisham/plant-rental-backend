import { v2 as cloudinary } from 'cloudinary';

// Configured once at module load time using env vars set in .env.
// All upload/delete calls share this single configured instance.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
