"use strict";
/**
 * Seed script — populates the database with sample plants.
 * Run: npx ts-node src/seed.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const plant_model_1 = require("./modules/plant/models/plant.model");
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const PLANTS = [
    {
        name: 'Peace Lily',
        category: 'Indoor',
        description: 'A graceful flowering plant with glossy dark-green leaves and elegant white blooms. Thrives in low light and helps purify indoor air. Perfect for offices and reception areas.',
        pricePerDay: 50,
        depositAmount: 300,
        stock: 10,
        careLevel: 'easy',
        images: [],
        isAvailable: true,
    },
    {
        name: 'Snake Plant',
        category: 'Indoor',
        description: 'One of the hardiest houseplants available. Its striking upright leaves with yellow edges make a bold statement. Tolerates low light and irregular watering — ideal for busy offices.',
        pricePerDay: 40,
        depositAmount: 250,
        stock: 15,
        careLevel: 'easy',
        images: [],
        isAvailable: true,
    },
    {
        name: 'Fiddle Leaf Fig',
        category: 'Indoor',
        description: 'A dramatic statement plant with large, violin-shaped leaves. Instantly elevates any interior space. Best placed near bright, indirect light. Popular for studios and showrooms.',
        pricePerDay: 120,
        depositAmount: 800,
        stock: 5,
        careLevel: 'hard',
        images: [],
        isAvailable: true,
    },
    {
        name: 'Bird of Paradise',
        category: 'Tropical',
        description: 'Bold tropical plant with large paddle-shaped leaves that creates a dramatic focal point. Loves bright light and adds an instant resort feel to any venue or event.',
        pricePerDay: 150,
        depositAmount: 1000,
        stock: 4,
        careLevel: 'medium',
        images: [],
        isAvailable: true,
    },
    {
        name: 'Pothos',
        category: 'Indoor',
        description: 'A fast-growing trailing vine with heart-shaped, variegated leaves. Extremely forgiving and adapts to almost any light condition. Great for hanging displays and shelves.',
        pricePerDay: 30,
        depositAmount: 150,
        stock: 20,
        careLevel: 'easy',
        images: [],
        isAvailable: true,
    },
    {
        name: 'Monstera Deliciosa',
        category: 'Tropical',
        description: 'The iconic Swiss cheese plant with its distinctive split leaves. A favourite for events, photoshoots, and modern office interiors. Requires moderate light and weekly watering.',
        pricePerDay: 100,
        depositAmount: 600,
        stock: 8,
        careLevel: 'medium',
        images: [],
        isAvailable: true,
    },
    {
        name: 'Aloe Vera',
        category: 'Succulent',
        description: 'A sculptural succulent with thick, fleshy leaves. Virtually maintenance-free and looks great in minimalist settings. Stores water in its leaves, so occasional watering is all it needs.',
        pricePerDay: 35,
        depositAmount: 200,
        stock: 12,
        careLevel: 'easy',
        images: [],
        isAvailable: true,
    },
    {
        name: 'Rubber Plant',
        category: 'Indoor',
        description: 'A classic indoor tree with large, glossy burgundy leaves. Adds a rich, sophisticated look to lobbies and conference rooms. Tolerates low light and needs minimal care.',
        pricePerDay: 80,
        depositAmount: 500,
        stock: 7,
        careLevel: 'medium',
        images: [],
        isAvailable: true,
    },
    {
        name: 'Areca Palm',
        category: 'Tropical',
        description: 'A lush, feathery palm that brings tropical vibes to any space. Excellent for events and weddings. Prefers bright indirect light and regular watering.',
        pricePerDay: 110,
        depositAmount: 700,
        stock: 6,
        careLevel: 'medium',
        images: [],
        isAvailable: true,
    },
    {
        name: 'Anthurium',
        category: 'Flowering',
        description: 'Striking waxy red blooms that last for weeks. A showstopper on reception desks and event centrepieces. Prefers bright indirect light and moderate humidity.',
        pricePerDay: 75,
        depositAmount: 450,
        stock: 9,
        careLevel: 'medium',
        images: [],
        isAvailable: true,
    },
    {
        name: 'ZZ Plant',
        category: 'Foliage',
        description: 'Glossy, dark-green leaves on graceful arching stems. Almost indestructible — thrives in low light and tolerates drought. One of the best choices for dim offices.',
        pricePerDay: 45,
        depositAmount: 280,
        stock: 14,
        careLevel: 'easy',
        images: [],
        isAvailable: true,
    },
    {
        name: 'Boston Fern',
        category: 'Foliage',
        description: 'Lush, feathery fronds that soften any space and improve humidity. Ideal for shaded corners in event venues. Requires consistent moisture and indirect light.',
        pricePerDay: 55,
        depositAmount: 320,
        stock: 11,
        careLevel: 'hard',
        images: [],
        isAvailable: true,
    },
];
async function seed() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('MONGO_URI is not set');
        process.exit(1);
    }
    await mongoose_1.default.connect(uri);
    console.log('Connected to MongoDB');
    const existing = await plant_model_1.Plant.countDocuments({ isDeleted: false });
    if (existing > 0) {
        console.log(`Database already has ${existing} plants. Skipping seed.`);
        await mongoose_1.default.disconnect();
        return;
    }
    await plant_model_1.Plant.insertMany(PLANTS);
    console.log(`✓ Inserted ${PLANTS.length} plants successfully`);
    await mongoose_1.default.disconnect();
}
seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
