import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import app from '../../app';
import { Order } from '../order/order.model';
import { Payment } from './payment.model';
import { User } from '../user/user.model';

// ─── Mock Razorpay ────────────────────────────────────────────────────────────

const MOCK_RZP_ORDER_ID = 'rzp_test_order_mock123';

jest.mock('razorpay', () =>
  jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({
        id: MOCK_RZP_ORDER_ID,
        amount: 100000,
        currency: 'INR',
      }),
    },
  }))
);

// ─── Shared state ─────────────────────────────────────────────────────────────

const BASE = '/api/payment';

let userToken: string;
let userId: string;
let orderId: string;

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Use a fixed Razorpay secret so signature generation stays deterministic.
  // Use a known test secret so signature generation in tests is deterministic
  process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_key_secret';
  process.env.RAZORPAY_KEY_ID = 'test_razorpay_key_id';

  await mongoose.connect(process.env.TEST_MONGO_URI!);
  await Payment.deleteMany({});
  await Order.deleteMany({ deliveryAddress: '123 Payment Test Street' });
  await User.deleteMany({ email: { $regex: '@payment-test\\.example$' } });

  const user = await User.create({
    name: 'Payment Customer',
    email: 'customer@payment-test.example',
    password: 'irrelevant-hashed',
    role: 'user',
  });
  userId = user._id.toString();
  userToken = jwt.sign(
    { id: userId, role: 'user' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await Payment.deleteMany({});
  await Order.deleteMany({ deliveryAddress: '123 Payment Test Street' });
  await User.deleteMany({ email: { $regex: '@payment-test\\.example$' } });
  await mongoose.disconnect();
});

// Create a fresh order before each test and clean up payments after each test
beforeEach(async () => {
  const order = await Order.create({
    userId: new mongoose.Types.ObjectId(userId),
    plants: [{ plantId: new mongoose.Types.ObjectId(), quantity: 1 }],
    rentalStartDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    rentalEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    totalPrice: 1000,
    deposit: 300,
    deliveryAddress: '123 Payment Test Street',
    policyAccepted: true,
  });
  orderId = order._id.toString();
});

afterEach(async () => {
  await Payment.deleteMany({});
  await Order.deleteMany({ deliveryAddress: '123 Payment Test Street' });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeSignature = (rzpOrderId: string, rzpPaymentId: string) =>
  crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest('hex');

// ─── POST /api/payment/create-order ──────────────────────────────────────────

describe('POST /api/payment/create-order', () => {
  it('creates Razorpay order and returns razorpayOrderId → 200', async () => {
    // The payment order should mirror the internal order total and currency.
    const res = await request(app)
      .post(`${BASE}/create-order`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.razorpayOrderId).toBe(MOCK_RZP_ORDER_ID);
    expect(res.body.data.amount).toBe(1000);
    expect(res.body.data.currency).toBe('INR');
    expect(res.body.data.paymentId).toBeDefined();
  });

  it('non-existent order → 404', async () => {
    const res = await request(app)
      .post(`${BASE}/create-order`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId: new mongoose.Types.ObjectId().toString() });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('invalid orderId format → 400', async () => {
    const res = await request(app)
      .post(`${BASE}/create-order`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId: 'not-a-valid-id' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('unauthenticated → 401', async () => {
    const res = await request(app)
      .post(`${BASE}/create-order`)
      .send({ orderId });

    expect(res.status).toBe(401);
  });
});

// ─── POST /api/payment/verify ────────────────────────────────────────────────

describe('POST /api/payment/verify', () => {
  beforeEach(async () => {
    // Seed a pending payment so the verify endpoint has something to reconcile.
    // Seed a pending payment record matching the mock Razorpay order ID
    await Payment.create({
      orderId: new mongoose.Types.ObjectId(orderId),
      userId: new mongoose.Types.ObjectId(userId),
      razorpayOrderId: MOCK_RZP_ORDER_ID,
      amount: 1000,
      currency: 'INR',
      status: 'pending',
    });
  });

  it('verifies valid payment signature → 200 with paid status', async () => {
    // A valid HMAC should mark the payment as paid and preserve the gateway payment ID.
    const razorpayPaymentId = 'pay_mock_valid_123';
    const signature = makeSignature(MOCK_RZP_ORDER_ID, razorpayPaymentId);

    const res = await request(app)
      .post(`${BASE}/verify`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ razorpayOrderId: MOCK_RZP_ORDER_ID, razorpayPaymentId, signature });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payment.status).toBe('paid');
    expect(res.body.data.payment.razorpayPaymentId).toBe(razorpayPaymentId);
  });

  it('invalid signature → 400', async () => {
    const res = await request(app)
      .post(`${BASE}/verify`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpayOrderId: MOCK_RZP_ORDER_ID,
        razorpayPaymentId: 'pay_mock_bad_123',
        signature: 'this_is_not_a_valid_hmac_signature',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('missing fields → 400', async () => {
    const res = await request(app)
      .post(`${BASE}/verify`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ razorpayOrderId: MOCK_RZP_ORDER_ID });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('unauthenticated → 401', async () => {
    const res = await request(app)
      .post(`${BASE}/verify`)
      .send({
        razorpayOrderId: MOCK_RZP_ORDER_ID,
        razorpayPaymentId: 'pay_mock_123',
        signature: 'some_signature',
      });

    expect(res.status).toBe(401);
  });
});
