"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("../../../app"));
const user_model_1 = require("../models/user.model");
// ─── Helpers ──────────────────────────────────────────────────────────────────
const BASE = '/api/users';
const AUTH_BASE = '/api/auth';
const DOMAIN = '@user-mgmt-test.example';
const makeEmail = (tag) => `${tag}${DOMAIN}`;
const PASSWORD = 'Password123';
const loginAs = async (email, password = PASSWORD) => {
    const res = await (0, supertest_1.default)(app_1.default).post(`${AUTH_BASE}/login`).send({ email, password });
    return res.body.data.accessToken;
};
// ─── State ────────────────────────────────────────────────────────────────────
let superAdminToken;
let userAdminToken;
let regularUserToken;
let targetUserId;
// ─── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
    // Seed a few roles up front so each permission test has a stable starting point.
    await mongoose_1.default.connect(process.env.TEST_MONGO_URI);
    await user_model_1.User.deleteMany({ email: { $regex: '@user-mgmt-test\\.example$' } });
    // Create super_admin
    const superAdmin = await user_model_1.User.create({
        name: 'Super Admin',
        email: makeEmail('superadmin'),
        password: (await import('bcryptjs')).default.hashSync(PASSWORD, 12),
        role: 'super_admin',
    });
    // Create user_admin
    await user_model_1.User.create({
        name: 'User Admin',
        email: makeEmail('useradmin'),
        password: (await import('bcryptjs')).default.hashSync(PASSWORD, 12),
        role: 'user_admin',
    });
    // Create regular user (the target for management operations)
    const target = await user_model_1.User.create({
        name: 'Target User',
        email: makeEmail('target'),
        password: (await import('bcryptjs')).default.hashSync(PASSWORD, 12),
        role: 'user',
    });
    // Create regular user for 403 test
    await user_model_1.User.create({
        name: 'Regular User',
        email: makeEmail('regular'),
        password: (await import('bcryptjs')).default.hashSync(PASSWORD, 12),
        role: 'user',
    });
    targetUserId = String(target._id);
    // Sign tokens via the auth endpoint
    superAdminToken = await loginAs(makeEmail('superadmin'));
    userAdminToken = await loginAs(makeEmail('useradmin'));
    regularUserToken = await loginAs(makeEmail('regular'));
});
afterAll(async () => {
    await user_model_1.User.deleteMany({ email: { $regex: '@user-mgmt-test\\.example$' } });
    await mongoose_1.default.disconnect();
});
// ─── 1. Get all users — super_admin → 200 ────────────────────────────────────
it('1. Get all users (super_admin) → 200 with paginated list', async () => {
    // Super admins should see the full paginated collection.
    const res = await (0, supertest_1.default)(app_1.default)
        .get(BASE)
        .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
    expect(typeof res.body.data.page).toBe('number');
    expect(typeof res.body.data.totalPages).toBe('number');
});
// ─── 2. Get all users — user_admin → 200 ─────────────────────────────────────
it('2. Get all users (user_admin) → 200', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .get(BASE)
        .set('Authorization', `Bearer ${userAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
});
// ─── 3. Get all users — regular user → 403 ───────────────────────────────────
it('3. Get all users (regular user) → 403', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .get(BASE)
        .set('Authorization', `Bearer ${regularUserToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
});
// ─── 4. Get all users — no token → 401 ───────────────────────────────────────
it('4. Get all users (no token) → 401', async () => {
    const res = await (0, supertest_1.default)(app_1.default).get(BASE);
    expect(res.status).toBe(401);
});
// ─── 5. Get user by id → 200 ─────────────────────────────────────────────────
it('5. Get user by id → 200', async () => {
    // This also verifies that sensitive auth fields stay hidden in the response.
    const res = await (0, supertest_1.default)(app_1.default)
        .get(`${BASE}/${targetUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user._id).toBe(targetUserId);
    // Sensitive fields must not leak
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.refreshToken).toBeUndefined();
});
// ─── 6. Get user by non-existent id → 404 ────────────────────────────────────
it('6. Get user by non-existent id → 404', async () => {
    const fakeId = new mongoose_1.default.Types.ObjectId().toString();
    const res = await (0, supertest_1.default)(app_1.default)
        .get(`${BASE}/${fakeId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
});
// ─── 7. Deactivate user → 200 ────────────────────────────────────────────────
it('7. Deactivate user → 200 + isActive false', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .patch(`${BASE}/${targetUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.isActive).toBe(false);
});
// ─── 8. Activate user → 200 ──────────────────────────────────────────────────
it('8. Activate user → 200 + isActive true', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .patch(`${BASE}/${targetUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.isActive).toBe(true);
});
// ─── 9. Update status — missing body → 400 ───────────────────────────────────
it('9. Update status with missing body → 400', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .patch(`${BASE}/${targetUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
});
// ─── 10. Update status — user_admin forbidden → 403 ──────────────────────────
it('10. Update status (user_admin) → 200 (user_admin has permission)', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .patch(`${BASE}/${targetUserId}/status`)
        .set('Authorization', `Bearer ${userAdminToken}`)
        .send({ isActive: true });
    expect(res.status).toBe(200);
});
// ─── 11. Delete user (soft) — regular user → 403 ─────────────────────────────
it('11. Delete user (regular user) → 403', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .delete(`${BASE}/${targetUserId}`)
        .set('Authorization', `Bearer ${regularUserToken}`);
    expect(res.status).toBe(403);
});
// ─── 12. Delete user (soft) — user_admin → 403 ───────────────────────────────
it('12. Delete user (user_admin) → 403 (only super_admin can delete)', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .delete(`${BASE}/${targetUserId}`)
        .set('Authorization', `Bearer ${userAdminToken}`);
    expect(res.status).toBe(403);
});
// ─── 13. Delete user (soft) — super_admin → 200 ──────────────────────────────
it('13. Delete user (super_admin) → 200', async () => {
    // Soft deletion is the privileged path that should actually remove the account from active views.
    const res = await (0, supertest_1.default)(app_1.default)
        .delete(`${BASE}/${targetUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('User deleted successfully');
});
// ─── 14. Get deleted user by id → 404 ────────────────────────────────────────
it('14. Get deleted user by id → 404', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .get(`${BASE}/${targetUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
});
// ─── 15. Deleted user not returned in list ────────────────────────────────────
it('15. Deleted user not returned in default list (isDeleted=false)', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .get(BASE)
        .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.users.map((u) => u._id);
    expect(ids).not.toContain(targetUserId);
});
// ─── 16. Filter by role ───────────────────────────────────────────────────────
it('16. Filter by role=super_admin → only super_admin users returned', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .get(`${BASE}?role=super_admin`)
        .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    res.body.data.users.forEach((u) => {
        expect(u.role).toBe('super_admin');
    });
});
// ─── 17. Search by name ───────────────────────────────────────────────────────
it('17. Search by name → matches returned', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .get(`${BASE}?search=User Admin`)
        .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBeGreaterThan(0);
});
