"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from .env file into process.env
// path.resolve ensures the .env is found relative to where the process is run (backend/ folder)
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
// Default to 5000 if PORT is not set in .env
const PORT = process.env.PORT || 5000;
// Guard: if MONGO_URI is missing, the app cannot connect to DB at all — fail fast
// process.exit(1) stops the server immediately with a non-zero code (signals error)
if (!MONGO_URI) {
    console.error('ERROR: MONGO_URI is not set. Ensure a .env file exists in the backend/ folder.');
    process.exit(1);
}
// Guard: JWT_SECRET is required to sign and verify auth tokens — app cannot run without it
if (!JWT_SECRET) {
    console.error('ERROR: JWT_SECRET is not set. Ensure a .env file exists in the backend/ folder.');
    process.exit(1);
}
// Connect to MongoDB first — only start the HTTP server if DB connection succeeds
// This prevents the server from accepting requests when the DB is unavailable
mongoose_1.default
    .connect(MONGO_URI)
    .then(() => {
    console.log('Connected to MongoDB');
    // Start Express server only after successful DB connection
    app_1.default.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
})
    .catch((err) => {
    // If MongoDB connection fails (wrong URI, network issue), log and exit
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
});
