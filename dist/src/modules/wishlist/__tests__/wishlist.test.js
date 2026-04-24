"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = __importDefault(require("../../../app"));
const wishlist_model_1 = require("../models/wishlist.model");
const plant_model_1 = require("../../plant/models/plant.model");
const user_model_1 = require("../../user/models/user.model");
// ─── Shared state ─────────────────────────────────────────────────────────────
const BASE = '/api/wishlist';
const DOMAIN = '@wishlist-test.example';
let userToken;
let otherUserToken;
let availablePlantId;
let anotherPlantId;
let deletedPlantId;
let unavailablePlantId;
// ─── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
    // Prepare two users and a small set of plant states for availability and ownership checks.
    await mongoose_1.default.connect(process.env.TEST_MONGO_URI);
    // Clean slate
    await user_model_1.User.deleteMany({ email: { $regex: '@wishlist-test\\.example$' } });
    await plant_model_1.Plant.deleteMany({ name: { $regex: /^Wishlist Test/ } });
    // Create users
    const user = await user_model_1.User.create({
        name: 'Wishlist User',
        email: `user${DOMAIN}`,
        password: 'irrelevant-hashed',
        role: 'user',
    });
    const otherUser = await user_model_1.User.create({
        name: 'Wishlist Other User',
        email: `other${DOMAIN}`,
        password: 'irrelevant-hashed',
        role: 'user',
    });
    userToken = jsonwebtoken_1.default.sign({ id: user._id.toString(), role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    otherUserToken = jsonwebtoken_1.default.sign({ id: otherUser._id.toString(), role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    // Create plants
    const available = await plant_model_1.Plant.create({
        name: 'Wishlist Test Fern',
        category: 'Indoor',
        description: 'A test fern for wishlist tests',
        pricePerDay: 10,
        depositAmount: 50,
        stock: 5,
        careLevel: 'easy',
        isAvailable: true,
        isDeleted: false,
    });
    const another = await plant_model_1.Plant.create({
        name: 'Wishlist Test Palm',
        category: 'Indoor',
        description: 'A test palm for wishlist tests',
        pricePerDay: 15,
        depositAmount: 60,
        stock: 3,
        careLevel: 'medium',
        isAvailable: true,
        isDeleted: false,
    });
    const deleted = await plant_model_1.Plant.create({
        name: 'Wishlist Test Deleted Plant',
        category: 'Indoor',
        description: 'A soft-deleted plant',
        pricePerDay: 8,
        depositAmount: 40,
        stock: 2,
        careLevel: 'easy',
        isAvailable: true,
        isDeleted: true, // soft-deleted
    });
    const unavailable = await plant_model_1.Plant.create({
        name: 'Wishlist Test Unavailable Plant',
        category: 'Indoor',
        description: 'An unavailable plant',
        pricePerDay: 12,
        depositAmount: 55,
        stock: 0,
        careLevel: 'hard',
        isAvailable: false,
        isDeleted: false,
    });
    availablePlantId = String(available._id);
    anotherPlantId = String(another._id);
    deletedPlantId = String(deleted._id);
    unavailablePlantId = String(unavailable._id);
    // Clear any pre-existing wishlists for these users
    await wishlist_model_1.Wishlist.deleteMany({ userId: { $in: [user._id, otherUser._id] } });
});
afterAll(async () => {
    await user_model_1.User.deleteMany({ email: { $regex: '@wishlist-test\\.example$' } });
    await plant_model_1.Plant.deleteMany({ name: { $regex: /^Wishlist Test/ } });
    await wishlist_model_1.Wishlist.deleteMany({});
    await mongoose_1.default.disconnect();
});
// ─── 1. Get wishlist — unauthenticated → 401 ─────────────────────────────────
it('1. Get wishlist (unauthenticated) → 401', async () => {
    const res = await (0, supertest_1.default)(app_1.default).get(BASE);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
});
// ─── 2. Get wishlist — empty (no wishlist yet) → 200 ─────────────────────────
it('2. Get wishlist before any adds → 200 with empty plants array', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .get(BASE)
        .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.wishlist.plants)).toBe(true);
    expect(res.body.data.wishlist.plants).toHaveLength(0);
});
// ─── 3. Add plant → 200 ──────────────────────────────────────────────────────
it('3. Add plant to wishlist → 200 with plant in list', async () => {
    // The wishlist should only accept an available, undeleted plant.
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/${availablePlantId}`)
        .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.wishlist.plants).toHaveLength(1);
});
// ─── 4. Add same plant twice → 400 ───────────────────────────────────────────
it('4. Add same plant twice → 400', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/${availablePlantId}`)
        .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
});
// ─── 5. Add deleted plant → 404 ──────────────────────────────────────────────
it('5. Add soft-deleted plant → 404', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/${deletedPlantId}`)
        .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
});
// ─── 6. Add unavailable plant → 404 ──────────────────────────────────────────
it('6. Add unavailable plant → 404', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/${unavailablePlantId}`)
        .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
});
// ─── 7. Add a second plant → 200 ─────────────────────────────────────────────
it('7. Add second plant → 200, wishlist now has 2 plants', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/${anotherPlantId}`)
        .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.wishlist.plants).toHaveLength(2);
});
// ─── 8. Get wishlist — populated plant details → 200 ─────────────────────────
it('8. Get wishlist → 200 with populated plant details', async () => {
    // Populated plant data should be enough for the UI card without exposing internal flags.
    const res = await (0, supertest_1.default)(app_1.default)
        .get(BASE)
        .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.wishlist.plants).toHaveLength(2);
    const plant = res.body.data.wishlist.plants[0].plantId;
    expect(plant).toHaveProperty('name');
    expect(plant).toHaveProperty('pricePerDay');
    expect(plant).toHaveProperty('careLevel');
    // Sensitive/internal fields should not be populated
    expect(plant.isDeleted).toBeUndefined();
});
// ─── 9. Wishlists are scoped per user ────────────────────────────────────────
it('9. Other user gets their own empty wishlist → 200', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .get(BASE)
        .set('Authorization', `Bearer ${otherUserToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.wishlist.plants).toHaveLength(0);
});
// ─── 10. Remove plant not in wishlist → 400 ──────────────────────────────────
it('10. Remove plant not in wishlist → 400', async () => {
    // Use other user who has an empty wishlist
    const res = await (0, supertest_1.default)(app_1.default)
        .delete(`${BASE}/${availablePlantId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
});
// ─── 11. Remove plant from wishlist → 200 ────────────────────────────────────
it('11. Remove plant from wishlist → 200 with updated list', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .delete(`${BASE}/${availablePlantId}`)
        .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.wishlist.plants).toHaveLength(1);
});
// ─── 12. Remove same plant again → 400 ───────────────────────────────────────
it('12. Remove already-removed plant → 400', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .delete(`${BASE}/${availablePlantId}`)
        .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
});
// ─── 13. Get wishlist after removal reflects correct count ────────────────────
it('13. Get wishlist after removal → 200 with 1 plant remaining', async () => {
    // This checks that the remove flow leaves the remaining item intact.
    const res = await (0, supertest_1.default)(app_1.default)
        .get(BASE)
        .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.wishlist.plants).toHaveLength(1);
    const remaining = res.body.data.wishlist.plants[0].plantId;
    expect(remaining._id).toBe(anotherPlantId);
});
