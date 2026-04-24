// Entry point — connects to MongoDB first, then starts the HTTP server.
// Server is intentionally started inside .then() so no requests are accepted
// before the DB is ready. Tests import app.ts directly and skip this file entirely.

import app from './app';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// path.resolve(process.cwd(), '.env') makes the path absolute relative to where the
// process is launched (backend/ dir), not relative to this source file's location.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 5000;

// Fail fast: a missing MONGO_URI or JWT_SECRET means the app is fundamentally broken.
// process.exit(1) signals to PM2/Docker that this was an abnormal exit (triggers restarts/alerts).
if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI is not set. Ensure a .env file exists in the backend/ folder.');
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is not set. Ensure a .env file exists in the backend/ folder.');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI as string) // cast required — TypeScript doesn't narrow past the if-guard above
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
