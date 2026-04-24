import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../../app';
import { Order } from '../models/order.model';
import { Plant } from '../../plant/models/plant.model';
import { User } from '../../user/models/user.model';

const BASE = '/api/orders';

// ─── Shared state ──────────────────────────────────────────────────────────────

let userToken: string;
let deliveryAdminToken: string;
let orderAdminToken: string;
let plantId: string;
let orderId: string;

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Seed the actors and plant once so order status and role checks run against the same record set.
  await mongoose.connect(process.env.TEST_MONGO_URI!);
  await Order.deleteMany({ deliveryAddress: '123 Test Order Street' });
  await Plant.deleteMany({ name: 'Order Test Fern' });
  await User.deleteMany({ email: { $regex: '@order-test\\.example$' } });

  // Seed plant
  const plant = await Plant.create({
    name: 'Order Test Fern',
    category: 'Indoor',
    description: 'Fern used exclusively for order integration tests, do not remove',
    pricePerDay: 10,
    depositAmount: 100,
    stock: 10,
    careLevel: 'easy',
    isAvailable: true,
  });
  plantId = plant._id.toString();

  // Create user (role: user — can place orders)
  const user = await User.create({
    name: 'Order Customer',
    email: 'customer@order-test.example',
    password: 'irrelevant-hashed',
    role: 'user',
  });
  userToken = jwt.sign(
    { id: user._id.toString(), role: 'user' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  // Create delivery_admin
  const deliveryAdmin = await User.create({
    name: 'Delivery Admin',
    email: 'delivery@order-test.example',
    password: 'irrelevant-hashed',
    role: 'delivery_admin',
  });
  deliveryAdminToken = jwt.sign(
    { id: deliveryAdmin._id.toString(), role: 'delivery_admin' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  // Create order_admin
  const orderAdmin = await User.create({
    name: 'Order Admin',
    email: 'order-admin@order-test.example',
    password: 'irrelevant-hashed',
    role: 'order_admin',
  });
  orderAdminToken = jwt.sign(
    { id: orderAdmin._id.toString(), role: 'order_admin' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await Order.deleteMany({ deliveryAddress: '123 Test Order Street' });
  await Plant.deleteMany({ name: 'Order Test Fern' });
  await User.deleteMany({ email: { $regex: '@order-test\\.example$' } });
  await mongoose.disconnect();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a valid order payload using dates safely in the future.
 * start = 24h from now, end = 72h from now → exactly 2 rental days.
 */
const validPayload = (overrides: Record<string, unknown> = {}) => {
  const now = Date.now();
  return {
    plants: [{ plantId, quantity: 2 }],
    rentalStartDate: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    rentalEndDate: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryAddress: '123 Test Order Street',
    policyAccepted: true,
    ...overrides,
  };
};

// ─── CREATE ORDER ─────────────────────────────────────────────────────────────

describe('POST /api/orders', () => {
it('creates order and returns correct price calculation → 201', async () => {
  // The total should combine rental charges and deposit exactly once.
  const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${userToken}`)
      .send(validPayload());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const order = res.body.data;
    // plant: pricePerDay=10, depositAmount=100, quantity=2, days=2
    // rentalTotal = 10 * 2 (days) * 2 (qty) = 40
    // deposit     = 100 * 2 (qty)           = 200
    // totalPrice  = 40 + 200                = 240
    expect(order.deposit).toBe(200);
    expect(order.totalPrice).toBe(240);
    expect(order.status).toBe('booked');
    expect(order.damageStatus).toBe('none');
    expect(order.depositRefunded).toBe(false);
    expect(order.policyAccepted).toBe(true);

    orderId = order._id;
  });

  it('stock is decremented by ordered quantity', async () => {
    const plant = await Plant.findById(plantId);
    // Started with stock=10, ordered quantity=2
    expect(plant!.stock).toBe(8);
  });

  it('policyAccepted: false → 400', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${userToken}`)
      .send(validPayload({ policyAccepted: false }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('policyAccepted missing → 400', async () => {
    const payload = validPayload();
    const { policyAccepted: _omit, ...withoutPolicy } = payload as typeof payload & { policyAccepted: boolean };
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${userToken}`)
      .send(withoutPolicy);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('insufficient stock → 400', async () => {
    // Remaining stock is 8, requesting 999
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${userToken}`)
      .send(validPayload({ plants: [{ plantId, quantity: 999 }] }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('unauthenticated → 401', async () => {
    const res = await request(app).post(BASE).send(validPayload());
    expect(res.status).toBe(401);
  });

  it('delivery_admin cannot place an order → 403', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${deliveryAdminToken}`)
      .send(validPayload());

    expect(res.status).toBe(403);
  });
});

// ─── GET MY ORDERS ────────────────────────────────────────────────────────────

describe('GET /api/orders', () => {
  it('user gets their own orders → 200 with array', async () => {
    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('unauthenticated → 401', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

// ─── STATUS UPDATE ────────────────────────────────────────────────────────────

describe('PATCH /api/orders/:id/status', () => {
it('delivery_admin updates status to delivered → 200', async () => {
  // Delivery admins are the only role expected to move the order lifecycle forward.
  const res = await request(app)
      .patch(`${BASE}/${orderId}/status`)
      .set('Authorization', `Bearer ${deliveryAdminToken}`)
      .send({ status: 'delivered' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('delivered');
  });

  it('regular user updates status → 403', async () => {
    const res = await request(app)
      .patch(`${BASE}/${orderId}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'picked' });

    expect(res.status).toBe(403);
  });

  it('order_admin updates status → 403 (wrong role)', async () => {
    const res = await request(app)
      .patch(`${BASE}/${orderId}/status`)
      .set('Authorization', `Bearer ${orderAdminToken}`)
      .send({ status: 'picked' });

    expect(res.status).toBe(403);
  });

  it('invalid status value → 400', async () => {
    const res = await request(app)
      .patch(`${BASE}/${orderId}/status`)
      .set('Authorization', `Bearer ${deliveryAdminToken}`)
      .send({ status: 'unknown' });

    expect(res.status).toBe(400);
  });
});

// ─── DAMAGE STATUS ────────────────────────────────────────────────────────────

describe('PATCH /api/orders/:id/damage', () => {
  it('order_admin sets damage to minor → 200', async () => {
    const res = await request(app)
      .patch(`${BASE}/${orderId}/damage`)
      .set('Authorization', `Bearer ${orderAdminToken}`)
      .send({ damageStatus: 'minor' });

    expect(res.status).toBe(200);
    expect(res.body.data.damageStatus).toBe('minor');
  });

  it('order_admin sets damage to major → 200', async () => {
    const res = await request(app)
      .patch(`${BASE}/${orderId}/damage`)
      .set('Authorization', `Bearer ${orderAdminToken}`)
      .send({ damageStatus: 'major' });

    expect(res.status).toBe(200);
    expect(res.body.data.damageStatus).toBe('major');
  });

  it('delivery_admin sets damage → 403 (wrong role)', async () => {
    const res = await request(app)
      .patch(`${BASE}/${orderId}/damage`)
      .set('Authorization', `Bearer ${deliveryAdminToken}`)
      .send({ damageStatus: 'none' });

    expect(res.status).toBe(403);
  });

  it('regular user sets damage → 403', async () => {
    const res = await request(app)
      .patch(`${BASE}/${orderId}/damage`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ damageStatus: 'none' });

    expect(res.status).toBe(403);
  });
});

// ─── DEPOSIT REFUND ───────────────────────────────────────────────────────────

describe('PATCH /api/orders/:id/deposit', () => {
  it('order_admin marks deposit as refunded → 200', async () => {
    const res = await request(app)
      .patch(`${BASE}/${orderId}/deposit`)
      .set('Authorization', `Bearer ${orderAdminToken}`)
      .send({ depositRefunded: true });

    expect(res.status).toBe(200);
    expect(res.body.data.depositRefunded).toBe(true);
  });

  it('delivery_admin marks deposit → 403 (wrong role)', async () => {
    const res = await request(app)
      .patch(`${BASE}/${orderId}/deposit`)
      .set('Authorization', `Bearer ${deliveryAdminToken}`)
      .send({ depositRefunded: false });

    expect(res.status).toBe(403);
  });

  it('regular user marks deposit → 403', async () => {
    const res = await request(app)
      .patch(`${BASE}/${orderId}/deposit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ depositRefunded: false });

    expect(res.status).toBe(403);
  });

  it('missing depositRefunded field → 400', async () => {
    const res = await request(app)
      .patch(`${BASE}/${orderId}/deposit`)
      .set('Authorization', `Bearer ${orderAdminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─── SOFT DELETE ──────────────────────────────────────────────────────────────

describe('Soft delete behaviour', () => {
it('order with isDeleted:true does not appear in GET /api/orders', async () => {
  // Soft-deleted orders should be invisible to the user-facing list endpoint.
  // Soft-delete directly via model (no DELETE endpoint exists)
  await Order.findByIdAndUpdate(orderId, { isDeleted: true });

    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    const returnedIds = res.body.data.map((o: { _id: string }) => o._id);
    expect(returnedIds).not.toContain(orderId);
  });
});
