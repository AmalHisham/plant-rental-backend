import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import userRoutes from '../app/modules/user/routes/user.routes';
import plantRoutes from '../app/modules/plant/routes/plant.routes';

// ts-node __dirname = backend/src → go up one level to backend/
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 5000;

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI is not set. Ensure a .env file exists in the backend/ folder.');
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is not set. Ensure a .env file exists in the backend/ folder.');
  process.exit(1);
}

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (_req, res) => {
  res.status(200).json({ success: true, message: 'Plant Rental Platform API' });
});

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// API routes
app.use('/api/auth', userRoutes);
app.use('/api/plants', plantRoutes);

// Connect to MongoDB and start server
mongoose
  .connect(MONGO_URI as string)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err: Error) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

export default app;
