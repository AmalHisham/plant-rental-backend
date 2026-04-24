"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = __importDefault(require("../../../app"));
const plant_model_1 = require("../models/plant.model");
const user_model_1 = require("../../user/models/user.model");
const BASE = '/api/plants';
// ─── Shared state ──────────────────────────────────────────────────────────────
let productAdminToken;
let userToken;
let createdPlantId;
const plantPayload = {
    name: 'Test Boston Fern',
    category: 'Indoor',
    description: 'A lush green fern perfect for indoor spaces and events',
    pricePerDay: 10,
    depositAmount: 50,
    stock: 5,
    careLevel: 'easy',
};
// ─── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
    // Seed admins, users, and a few plants so each CRUD and filter branch is deterministic.
    await mongoose_1.default.connect(process.env.TEST_MONGO_URI);
    await plant_model_1.Plant.deleteMany({ name: { $regex: /^Test/ } });
    await user_model_1.User.deleteMany({ email: { $regex: '@plant-test\\.example$' } });
    // Create product_admin — sign token directly (no HTTP needed for setup)
    const admin = await user_model_1.User.create({
        name: 'Plant Product Admin',
        email: 'product-admin@plant-test.example',
        password: 'irrelevant-hashed',
        role: 'product_admin',
    });
    productAdminToken = jsonwebtoken_1.default.sign({ id: admin._id.toString(), role: 'product_admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    // Create regular user
    const user = await user_model_1.User.create({
        name: 'Plant Regular User',
        email: 'regular-user@plant-test.example',
        password: 'irrelevant-hashed',
        role: 'user',
    });
    userToken = jsonwebtoken_1.default.sign({ id: user._id.toString(), role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    // Seed extra plants one-by-one so each gets a distinct createdAt timestamp.
    // This guarantees stable sort order for pagination tests regardless of how
    // fast the DB responds — insertMany gives all docs the same timestamp.
    await plant_model_1.Plant.create({
        name: 'Test Cactus',
        category: 'Desert',
        description: 'Hardy desert cactus, very low maintenance and water efficient',
        pricePerDay: 5,
        depositAmount: 30,
        stock: 10,
        careLevel: 'easy',
        isAvailable: true,
    });
    await plant_model_1.Plant.create({
        name: 'Test Orchid',
        category: 'Flowering',
        description: 'Elegant orchid with vibrant blooms, perfect for premium events',
        pricePerDay: 20,
        depositAmount: 100,
        stock: 3,
        careLevel: 'hard',
        isAvailable: true,
    });
    await plant_model_1.Plant.create({
        name: 'Test Peace Lily',
        category: 'Indoor',
        description: 'Classic peace lily, great air-purifying indoor plant for offices',
        pricePerDay: 8,
        depositAmount: 40,
        stock: 7,
        careLevel: 'medium',
        isAvailable: false,
    });
    // Ensure text index exists for search tests
    await plant_model_1.Plant.createIndexes();
});
afterAll(async () => {
    await plant_model_1.Plant.deleteMany({ name: { $regex: /^Test/ } });
    await user_model_1.User.deleteMany({ email: { $regex: '@plant-test\\.example$' } });
    await mongoose_1.default.disconnect();
});
// ─── CREATE ───────────────────────────────────────────────────────────────────
describe('POST /api/plants', () => {
    it('product_admin creates plant → 201 with plant data', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post(BASE)
            .set('Authorization', `Bearer ${productAdminToken}`)
            .send(plantPayload);
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Test Boston Fern');
        expect(res.body.data.isDeleted).toBe(false);
        createdPlantId = res.body.data._id;
    });
    it('regular user creates plant → 403', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post(BASE)
            .set('Authorization', `Bearer ${userToken}`)
            .send(plantPayload);
        expect(res.status).toBe(403);
    });
    it('unauthenticated request → 401', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post(BASE).send(plantPayload);
        expect(res.status).toBe(401);
    });
    it('missing required fields → 400', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post(BASE)
            .set('Authorization', `Bearer ${productAdminToken}`)
            .send({ name: 'Incomplete Plant' });
        expect(res.status).toBe(400);
    });
});
// ─── READ – LIST ──────────────────────────────────────────────────────────────
describe('GET /api/plants', () => {
    it('returns 200 with plants array and pagination', async () => {
        // The browse endpoint should always return both data and pagination metadata.
        const res = await (0, supertest_1.default)(app_1.default).get(BASE);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.plants)).toBe(true);
        expect(res.body.data.pagination).toHaveProperty('total');
        expect(res.body.data.pagination).toHaveProperty('page');
        expect(res.body.data.pagination).toHaveProperty('limit');
        expect(res.body.data.pagination).toHaveProperty('totalPages');
    });
    it('filter by category (Indoor) → only Indoor plants returned', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get(`${BASE}?category=Indoor`);
        expect(res.status).toBe(200);
        expect(res.body.data.plants.length).toBeGreaterThan(0);
        res.body.data.plants.forEach((p) => {
            expect(p.category.toLowerCase()).toContain('indoor');
        });
    });
    it('filter by careLevel=easy → only easy plants returned', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get(`${BASE}?careLevel=easy`);
        expect(res.status).toBe(200);
        expect(res.body.data.plants.length).toBeGreaterThan(0);
        res.body.data.plants.forEach((p) => {
            expect(p.careLevel).toBe('easy');
        });
    });
    it('filter by isAvailable=true → only available plants returned', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get(`${BASE}?isAvailable=true`);
        expect(res.status).toBe(200);
        res.body.data.plants.forEach((p) => {
            expect(p.isAvailable).toBe(true);
        });
    });
    it('filter by minPrice=15 → only plants with pricePerDay >= 15', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get(`${BASE}?minPrice=15`);
        expect(res.status).toBe(200);
        res.body.data.plants.forEach((p) => {
            expect(p.pricePerDay).toBeGreaterThanOrEqual(15);
        });
    });
    it('pagination: limit=1 → returns at most 1 plant per page', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get(`${BASE}?page=1&limit=1`);
        expect(res.status).toBe(200);
        expect(res.body.data.plants.length).toBeLessThanOrEqual(1);
        expect(res.body.data.pagination.limit).toBe(1);
    });
    it('pagination: page=2&limit=1 → returns different plant than page 1', async () => {
        // Page boundaries should change the actual result set, not just the metadata.
        const page1 = await (0, supertest_1.default)(app_1.default).get(`${BASE}?page=1&limit=1`);
        const page2 = await (0, supertest_1.default)(app_1.default).get(`${BASE}?page=2&limit=1`);
        expect(page1.status).toBe(200);
        expect(page2.status).toBe(200);
        if (page1.body.data.plants.length > 0 && page2.body.data.plants.length > 0) {
            expect(page1.body.data.plants[0]._id).not.toBe(page2.body.data.plants[0]._id);
        }
    });
    it('invalid careLevel value → 400', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get(`${BASE}?careLevel=impossible`);
        expect(res.status).toBe(400);
    });
});
// ─── READ – SINGLE ────────────────────────────────────────────────────────────
describe('GET /api/plants/:id', () => {
    it('valid id → 200 with plant data', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get(`${BASE}/${createdPlantId}`);
        expect(res.status).toBe(200);
        expect(res.body.data._id).toBe(createdPlantId);
        expect(res.body.data.name).toBe('Test Boston Fern');
    });
    it('non-existent id → 404', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get(`${BASE}/${new mongoose_1.default.Types.ObjectId()}`);
        expect(res.status).toBe(404);
    });
    it('invalid ObjectId format → 404', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get(`${BASE}/not-a-valid-id`);
        expect(res.status).toBe(404);
    });
});
// ─── UPDATE ───────────────────────────────────────────────────────────────────
describe('PUT /api/plants/:id', () => {
    it('product_admin updates plant → 200 with updated data', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .put(`${BASE}/${createdPlantId}`)
            .set('Authorization', `Bearer ${productAdminToken}`)
            .send({ pricePerDay: 15, stock: 8 });
        expect(res.status).toBe(200);
        expect(res.body.data.pricePerDay).toBe(15);
        expect(res.body.data.stock).toBe(8);
    });
    it('regular user updates plant → 403', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .put(`${BASE}/${createdPlantId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ pricePerDay: 99 });
        expect(res.status).toBe(403);
    });
    it('empty body → 400 (at least one field required)', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .put(`${BASE}/${createdPlantId}`)
            .set('Authorization', `Bearer ${productAdminToken}`)
            .send({});
        expect(res.status).toBe(400);
    });
    it('non-existent plant → 404', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .put(`${BASE}/${new mongoose_1.default.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${productAdminToken}`)
            .send({ pricePerDay: 5 });
        expect(res.status).toBe(404);
    });
});
// ─── DELETE (soft) ────────────────────────────────────────────────────────────
describe('DELETE /api/plants/:id', () => {
    it('regular user soft-deletes plant → 403', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .delete(`${BASE}/${createdPlantId}`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(403);
    });
    it('product_admin soft-deletes plant → 200', async () => {
        // Soft deletion keeps the record for historical queries while hiding it from normal browsing.
        const res = await (0, supertest_1.default)(app_1.default)
            .delete(`${BASE}/${createdPlantId}`)
            .set('Authorization', `Bearer ${productAdminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
    it('soft-deleted plant is not returned by GET /:id → 404', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get(`${BASE}/${createdPlantId}`);
        expect(res.status).toBe(404);
    });
    it('soft-deleted plant does not appear in list', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get(BASE);
        expect(res.status).toBe(200);
        const ids = res.body.data.plants.map((p) => p._id);
        expect(ids).not.toContain(createdPlantId);
    });
});
