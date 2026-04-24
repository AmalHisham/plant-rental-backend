import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { Cart } from './models/cart.model';
import { Plant } from '../plant/models/plant.model';
import { User } from '../user/models/user.model';

// ─── Shared state ─────────────────────────────────────────────────────────────

const BASE = '/api/cart';
const DOMAIN = '@cart-test.example';

// Dates always in the future so Joi's min('now') never rejects them
const startDate = new Date();
startDate.setDate(startDate.getDate() + 2);
startDate.setHours(12, 0, 0, 0);

const endDate = new Date();
endDate.setDate(endDate.getDate() + 9);
endDate.setHours(12, 0, 0, 0);

const laterEndDate = new Date();
laterEndDate.setDate(laterEndDate.getDate() + 14);
laterEndDate.setHours(12, 0, 0, 0);

let userToken: string;
let otherUserToken: string;
let availablePlantId: string;
let anotherPlantId: string;
let deletedPlantId: string;
let unavailablePlantId: string;
let lowStockPlantId: string;

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Seed two users and a handful of plants so stock and ownership checks are reproducible.
  await mongoose.connect(process.env.TEST_MONGO_URI!);

  await User.deleteMany({ email: { $regex: '@cart-test\\.example$' } });
  await Plant.deleteMany({ name: { $regex: /^Cart Test/ } });

  const user = await User.create({
    name: 'Cart User',
    email: `user${DOMAIN}`,
    password: 'irrelevant-hashed',
    role: 'user',
  });
  const otherUser = await User.create({
    name: 'Cart Other User',
    email: `other${DOMAIN}`,
    password: 'irrelevant-hashed',
    role: 'user',
  });

  userToken = jwt.sign(
    { id: user._id.toString(), role: 'user' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
  otherUserToken = jwt.sign(
    { id: otherUser._id.toString(), role: 'user' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  const available = await Plant.create({
    name: 'Cart Test Fern',
    category: 'Indoor',
    description: 'A test fern for cart tests',
    pricePerDay: 10,
    depositAmount: 50,
    stock: 5,
    careLevel: 'easy',
    isAvailable: true,
    isDeleted: false,
  });
  const another = await Plant.create({
    name: 'Cart Test Palm',
    category: 'Indoor',
    description: 'A test palm for cart tests',
    pricePerDay: 15,
    depositAmount: 60,
    stock: 3,
    careLevel: 'medium',
    isAvailable: true,
    isDeleted: false,
  });
  const deleted = await Plant.create({
    name: 'Cart Test Deleted Plant',
    category: 'Indoor',
    description: 'A soft-deleted plant',
    pricePerDay: 8,
    depositAmount: 40,
    stock: 2,
    careLevel: 'easy',
    isAvailable: true,
    isDeleted: true,
  });
  const unavailable = await Plant.create({
    name: 'Cart Test Unavailable Plant',
    category: 'Indoor',
    description: 'An unavailable plant',
    pricePerDay: 12,
    depositAmount: 55,
    stock: 0,
    careLevel: 'hard',
    isAvailable: false,
    isDeleted: false,
  });
  const lowStock = await Plant.create({
    name: 'Cart Test Low Stock Plant',
    category: 'Indoor',
    description: 'A plant with only 1 unit in stock',
    pricePerDay: 20,
    depositAmount: 80,
    stock: 1,
    careLevel: 'medium',
    isAvailable: true,
    isDeleted: false,
  });

  availablePlantId = String(available._id);
  anotherPlantId = String(another._id);
  deletedPlantId = String(deleted._id);
  unavailablePlantId = String(unavailable._id);
  lowStockPlantId = String(lowStock._id);

  await Cart.deleteMany({ userId: { $in: [user._id, otherUser._id] } });
});

afterAll(async () => {
  await User.deleteMany({ email: { $regex: '@cart-test\\.example$' } });
  await Plant.deleteMany({ name: { $regex: /^Cart Test/ } });
  await Cart.deleteMany({});
  await mongoose.disconnect();
});

// ─── 1. Unauthenticated GET → 401 ────────────────────────────────────────────

it('1. GET cart (unauthenticated) → 401', async () => {
  const res = await request(app).get(BASE);
  expect(res.status).toBe(401);
});

// ─── 2. GET empty cart → 200 with empty items ────────────────────────────────

it('2. GET cart before any adds → 200 with empty items and cartTotal 0', async () => {
  const res = await request(app)
    .get(BASE)
    .set('Authorization', `Bearer ${userToken}`);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.cart.items).toHaveLength(0);
  expect(res.body.data.cart.cartTotal).toBe(0);
});

// ─── 3. Add item → 200 ───────────────────────────────────────────────────────

it('3. Add item to cart → 200 with 1 item and computed totals', async () => {
  // This proves the backend recalculates quantity, rental days, and price server-side.
  const res = await request(app)
    .post(`${BASE}/items`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      plantId: availablePlantId,
      quantity: 1,
      rentalStartDate: startDate,
      rentalEndDate: endDate,
    });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.cart.items).toHaveLength(1);
  expect(res.body.data.cart.items[0].rentalDays).toBe(7);
  expect(res.body.data.cart.items[0].rentalTotal).toBe(10 * 7 * 1);
  expect(res.body.data.cart.items[0].deposit).toBe(50 * 1);
  expect(res.body.data.cart.items[0].itemTotal).toBe(70 + 50);
  expect(res.body.data.cart.cartTotal).toBe(120);
});

// ─── 4. Add same plant twice → 400 ───────────────────────────────────────────

it('4. Add same plant twice → 400', async () => {
  const res = await request(app)
    .post(`${BASE}/items`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      plantId: availablePlantId,
      quantity: 1,
      rentalStartDate: startDate,
      rentalEndDate: endDate,
    });

  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
});

// ─── 5. Add deleted plant → 404 ──────────────────────────────────────────────

it('5. Add soft-deleted plant → 404', async () => {
  const res = await request(app)
    .post(`${BASE}/items`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      plantId: deletedPlantId,
      quantity: 1,
      rentalStartDate: startDate,
      rentalEndDate: endDate,
    });

  expect(res.status).toBe(404);
  expect(res.body.success).toBe(false);
});

// ─── 6. Add unavailable plant → 404 ──────────────────────────────────────────

it('6. Add unavailable plant → 404', async () => {
  const res = await request(app)
    .post(`${BASE}/items`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      plantId: unavailablePlantId,
      quantity: 1,
      rentalStartDate: startDate,
      rentalEndDate: endDate,
    });

  expect(res.status).toBe(404);
  expect(res.body.success).toBe(false);
});

// ─── 7. Add item with quantity exceeding stock → 400 ─────────────────────────

it('7. Add item with quantity > stock → 400', async () => {
  const res = await request(app)
    .post(`${BASE}/items`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      plantId: lowStockPlantId,
      quantity: 99,
      rentalStartDate: startDate,
      rentalEndDate: endDate,
    });

  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
});

// ─── 8. Add item with end date before start date → 400 ───────────────────────

it('8. Add item with endDate before startDate → 400', async () => {
  const res = await request(app)
    .post(`${BASE}/items`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      plantId: anotherPlantId,
      quantity: 1,
      rentalStartDate: endDate,
      rentalEndDate: startDate, // reversed
    });

  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
});

// ─── 9. Add item with start date in the past → 400 ───────────────────────────

it('9. Add item with startDate in the past → 400', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const res = await request(app)
    .post(`${BASE}/items`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      plantId: anotherPlantId,
      quantity: 1,
      rentalStartDate: yesterday,
      rentalEndDate: endDate,
    });

  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
});

// ─── 10. Add a second plant → 200 ────────────────────────────────────────────

it('10. Add second plant → 200, cart has 2 items', async () => {
  const res = await request(app)
    .post(`${BASE}/items`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      plantId: anotherPlantId,
      quantity: 2,
      rentalStartDate: startDate,
      rentalEndDate: endDate,
    });

  expect(res.status).toBe(200);
  expect(res.body.data.cart.items).toHaveLength(2);
});

// ─── 11. GET cart → populated plant details and correct totals ────────────────

it('11. GET cart → 200 with populated plant fields and correct cartTotal', async () => {
  // The response should include populated plant details plus derived totals.
  const res = await request(app)
    .get(BASE)
    .set('Authorization', `Bearer ${userToken}`);

  expect(res.status).toBe(200);
  const { items, cartTotal } = res.body.data.cart;
  expect(items).toHaveLength(2);

  const first = items[0];
  expect(first.plantId).toHaveProperty('name');
  expect(first.plantId).toHaveProperty('pricePerDay');
  expect(first.plantId).toHaveProperty('depositAmount');
  expect(first.plantId.isDeleted).toBeUndefined();

  expect(typeof first.rentalDays).toBe('number');
  expect(typeof first.rentalTotal).toBe('number');
  expect(typeof first.deposit).toBe('number');
  expect(typeof first.itemTotal).toBe('number');
  expect(typeof cartTotal).toBe('number');
  expect(cartTotal).toBeGreaterThan(0);
});

// ─── 12. Update item quantity → 200 ──────────────────────────────────────────

it('12. Update item quantity → 200 with recalculated totals', async () => {
  const res = await request(app)
    .put(`${BASE}/items/${availablePlantId}`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({ quantity: 3 });

  expect(res.status).toBe(200);
  const updated = res.body.data.cart.items.find(
    (i: { plantId: { _id: string } }) => i.plantId._id === availablePlantId
  );
  expect(updated.quantity).toBe(3);
  expect(updated.deposit).toBe(50 * 3);
});

// ─── 13. Update item with empty body → 400 ───────────────────────────────────

it('13. Update item with empty body → 400', async () => {
  const res = await request(app)
    .put(`${BASE}/items/${availablePlantId}`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({});

  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
});

// ─── 14. Update item not in cart → 404 ───────────────────────────────────────

it('14. Update item not in cart → 404', async () => {
  const res = await request(app)
    .put(`${BASE}/items/${lowStockPlantId}`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({ quantity: 1 });

  expect(res.status).toBe(404);
  expect(res.body.success).toBe(false);
});

// ─── 15. Carts are scoped per user ───────────────────────────────────────────

it('15. Other user cart is empty (scoped per user) → 200', async () => {
  const res = await request(app)
    .get(BASE)
    .set('Authorization', `Bearer ${otherUserToken}`);

  expect(res.status).toBe(200);
  expect(res.body.data.cart.items).toHaveLength(0);
});

// ─── 16. Remove item not in cart → 400 ───────────────────────────────────────

it('16. Remove item not in cart → 400', async () => {
  const res = await request(app)
    .delete(`${BASE}/items/${lowStockPlantId}`)
    .set('Authorization', `Bearer ${userToken}`);

  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
});

// ─── 17. Remove item → 200 ───────────────────────────────────────────────────

it('17. Remove item from cart → 200, cart has 1 item', async () => {
  const res = await request(app)
    .delete(`${BASE}/items/${availablePlantId}`)
    .set('Authorization', `Bearer ${userToken}`);

  expect(res.status).toBe(200);
  expect(res.body.data.cart.items).toHaveLength(1);
  expect(res.body.data.cart.items[0].plantId._id).toBe(anotherPlantId);
});

// ─── 18. Remove same item again → 400 ────────────────────────────────────────

it('18. Remove already-removed item → 400', async () => {
  const res = await request(app)
    .delete(`${BASE}/items/${availablePlantId}`)
    .set('Authorization', `Bearer ${userToken}`);

  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
});

// ─── 19. Clear cart → 200 ────────────────────────────────────────────────────

it('19. Clear cart → 200', async () => {
  // Clearing the cart should preserve the cart document but empty its items array.
  const res = await request(app)
    .delete(BASE)
    .set('Authorization', `Bearer ${userToken}`);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe('Cart cleared');
});

// ─── 20. GET cart after clear → empty ────────────────────────────────────────

it('20. GET cart after clear → 200 with empty items', async () => {
  const res = await request(app)
    .get(BASE)
    .set('Authorization', `Bearer ${userToken}`);

  expect(res.status).toBe(200);
  expect(res.body.data.cart.items).toHaveLength(0);
  expect(res.body.data.cart.cartTotal).toBe(0);
});
