import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { User } from '../user/user.model';
import { Plant } from '../plant/plant.model';
import { Order } from '../order/order.model';

// Mock email service to prevent real emails during tests
jest.mock('../user/service/email.service', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}));

const BASE = '/api/admin';

let superAdminToken: string;
let orderAdminToken: string;
let userToken: string;
let plantId: string;

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Seed one plant, three roles, and a couple of orders so dashboard and filter tests have real data.
  await mongoose.connect(process.env.TEST_MONGO_URI!);

  await User.deleteMany({ email: { $regex: '@admin-test\\.example$' } });
  await Order.deleteMany({ deliveryAddress: '123 Admin Test Street' });
  await Plant.deleteMany({ name: 'Admin Test Plant' });

  const plant = await Plant.create({
    name: 'Admin Test Plant',
    category: 'Indoor',
    description: 'Plant used for admin integration tests',
    pricePerDay: 20,
    depositAmount: 200,
    stock: 10,
    careLevel: 'easy',
    isAvailable: true,
  });
  plantId = plant._id.toString();

  const superAdmin = await User.create({
    name: 'Super Admin Test',
    email: 'superadmin@admin-test.example',
    password: 'hashed',
    role: 'super_admin',
  });
  superAdminToken = jwt.sign(
    { id: superAdmin._id.toString(), role: 'super_admin' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  const orderAdmin = await User.create({
    name: 'Order Admin Test',
    email: 'orderadmin@admin-test.example',
    password: 'hashed',
    role: 'order_admin',
  });
  orderAdminToken = jwt.sign(
    { id: orderAdmin._id.toString(), role: 'order_admin' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  const user = await User.create({
    name: 'Regular User Test',
    email: 'user@admin-test.example',
    password: 'hashed',
    role: 'user',
  });
  userToken = jwt.sign(
    { id: user._id.toString(), role: 'user' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  const now = Date.now();
  const start = new Date(now + 24 * 60 * 60 * 1000);
  const end = new Date(now + 3 * 24 * 60 * 60 * 1000);

  await Order.create({
    userId: superAdmin._id,
    plants: [{ plantId: plant._id, quantity: 1 }],
    rentalStartDate: start,
    rentalEndDate: end,
    totalPrice: 240,
    deposit: 200,
    deliveryAddress: '123 Admin Test Street',
    status: 'booked',
    policyAccepted: true,
    paymentStatus: 'paid',
  });

  await Order.create({
    userId: superAdmin._id,
    plants: [{ plantId: plant._id, quantity: 1 }],
    rentalStartDate: start,
    rentalEndDate: end,
    totalPrice: 240,
    deposit: 200,
    deliveryAddress: '123 Admin Test Street',
    status: 'delivered',
    policyAccepted: true,
    paymentStatus: 'pending',
  });
});

afterAll(async () => {
  await User.deleteMany({ email: { $regex: '@admin-test\\.example$' } });
  await Order.deleteMany({ deliveryAddress: '123 Admin Test Street' });
  await Plant.deleteMany({ name: 'Admin Test Plant' });
  await mongoose.disconnect();
});

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────

describe('GET /api/admin/dashboard', () => {
it('super_admin gets dashboard stats → 200', async () => {
    // Only the highest admin role should see aggregate platform metrics.
    const res = await request(app)
      .get(`${BASE}/dashboard`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalUsers');
    expect(res.body.data).toHaveProperty('totalPlants');
    expect(res.body.data).toHaveProperty('totalOrders');
    expect(res.body.data).toHaveProperty('totalRevenue');
    expect(res.body.data).toHaveProperty('ordersByStatus');
    expect(res.body.data).toHaveProperty('recentOrders');
    expect(res.body.data).toHaveProperty('lowStockPlants');
    expect(res.body.data).toHaveProperty('topPlants');
  });

  it('regular user → 403', async () => {
    const res = await request(app)
      .get(`${BASE}/dashboard`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('order_admin → 403', async () => {
    const res = await request(app)
      .get(`${BASE}/dashboard`)
      .set('Authorization', `Bearer ${orderAdminToken}`);

    expect(res.status).toBe(403);
  });

  it('dashboard shows correct counts', async () => {
    const res = await request(app)
      .get(`${BASE}/dashboard`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    const { ordersByStatus, totalRevenue, recentOrders } = res.body.data;

    // We created 1 booked (paid=240) + 1 delivered (pending) order
    expect(ordersByStatus.booked).toBeGreaterThanOrEqual(1);
    expect(ordersByStatus.delivered).toBeGreaterThanOrEqual(1);
    // Only paid orders contribute to revenue; the booked order is paid with totalPrice=240
    expect(totalRevenue).toBeGreaterThanOrEqual(240);
    // recentOrders is an array
    expect(Array.isArray(recentOrders)).toBe(true);
  });
});

// ─── GET /api/admin/orders ────────────────────────────────────────────────────

describe('GET /api/admin/orders', () => {
it('super_admin gets all orders → 200', async () => {
    // This endpoint should return a paginated list with populated relations.
    const res = await request(app)
      .get(`${BASE}/orders`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('orders');
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('page');
    expect(res.body.data).toHaveProperty('totalPages');
    expect(Array.isArray(res.body.data.orders)).toBe(true);
  });

  it('order_admin gets all orders → 200', async () => {
    const res = await request(app)
      .get(`${BASE}/orders`)
      .set('Authorization', `Bearer ${orderAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('regular user → 403', async () => {
    const res = await request(app)
      .get(`${BASE}/orders`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('filter orders by status=booked returns only booked orders', async () => {
    const res = await request(app)
      .get(`${BASE}/orders?status=booked`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    const orders = res.body.data.orders as Array<{ status: string }>;
    expect(orders.length).toBeGreaterThan(0);
    orders.forEach((order) => {
      expect(order.status).toBe('booked');
    });
  });
});

// ─── POST /api/admin/create-admin ─────────────────────────────────────────────

describe('POST /api/admin/create-admin', () => {
it('super_admin creates a new admin → 201', async () => {
    // Admin provisioning should return the new public profile without the generated password.
    const res = await request(app)
      .post(`${BASE}/create-admin`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'New Product Admin',
        email: 'newproduct@admin-test.example',
        role: 'product_admin',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('product_admin');
    expect(res.body.data.email).toBe('newproduct@admin-test.example');
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('create admin with role "user" → 400', async () => {
    const res = await request(app)
      .post(`${BASE}/create-admin`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Bad Role User',
        email: 'badrole@admin-test.example',
        role: 'user',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('non-super_admin → 403', async () => {
    const res = await request(app)
      .post(`${BASE}/create-admin`)
      .set('Authorization', `Bearer ${orderAdminToken}`)
      .send({
        name: 'Unauthorized',
        email: 'unauthorized@admin-test.example',
        role: 'product_admin',
      });

    expect(res.status).toBe(403);
  });

  it('duplicate email → 409', async () => {
    // newproduct@admin-test.example was created in the first test
    const res = await request(app)
      .post(`${BASE}/create-admin`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Duplicate Admin',
        email: 'newproduct@admin-test.example',
        role: 'product_admin',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});
