/**
 * seedAll.ts — Populates the database with admin users, regular users, orders,
 * addresses, payments, carts, and wishlists for admin panel testing.
 *
 * Prerequisites: Run seed.ts first to populate plants.
 * Run: npx ts-node src/seedAll.ts  (or: npm run seed:all)
 *
 * Idempotent: safe to re-run — existing records are skipped, not duplicated.
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserRole } from './modules/user/user.model';
import { Plant } from './modules/plant/plant.model';
import { Order } from './modules/order/order.model';
import { Address } from './modules/profile/address.model';
import { Cart } from './modules/cart/cart.model';
import { Wishlist } from './modules/wishlist/wishlist.model';
import { Payment } from './modules/payment/payment.model';

// ─── Static seed data ─────────────────────────────────────────────────────────

const ADMIN_PASSWORD = 'Admin@1234';
const USER_PASSWORD = 'User@1234';

interface SeedAdmin {
  name: string;
  email: string;
  role: UserRole;
}

const ADMINS: SeedAdmin[] = [
  { name: 'Sneha Pillai',  email: 'sneha.pillai@plantadmin.com',  role: 'super_admin'    },
  { name: 'Priya Sharma',  email: 'priya.sharma@plantadmin.com',  role: 'product_admin'  },
  { name: 'Rohan Mehta',   email: 'rohan.mehta@plantadmin.com',   role: 'order_admin'    },
  { name: 'Kavya Nair',    email: 'kavya.nair@plantadmin.com',    role: 'delivery_admin' },
  { name: 'Amit Verma',    email: 'amit.verma@plantadmin.com',    role: 'user_admin'     },
];

interface SeedUser {
  name: string;
  email: string;
  phone: string;
  policyAccepted: boolean;
  isActive: boolean;
}

const USERS: SeedUser[] = [
  { name: 'Arjun Kapoor',   email: 'arjun.kapoor@gmail.com',   phone: '9876543210', policyAccepted: true,  isActive: true  },
  { name: 'Meera Iyer',     email: 'meera.iyer@gmail.com',     phone: '9876543211', policyAccepted: true,  isActive: true  },
  { name: 'Vikram Bose',    email: 'vikram.bose@gmail.com',    phone: '9876543212', policyAccepted: true,  isActive: true  },
  { name: 'Pooja Reddy',    email: 'pooja.reddy@gmail.com',    phone: '9876543213', policyAccepted: true,  isActive: true  },
  { name: 'Rahul Joshi',    email: 'rahul.joshi@gmail.com',    phone: '9876543214', policyAccepted: true,  isActive: true  },
  { name: 'Ananya Das',     email: 'ananya.das@gmail.com',     phone: '9876543215', policyAccepted: true,  isActive: true  },
  { name: 'Siddharth Rao',  email: 'sid.rao@gmail.com',        phone: '9876543216', policyAccepted: true,  isActive: true  },
  { name: 'Nisha Gupta',    email: 'nisha.gupta@gmail.com',    phone: '9876543217', policyAccepted: true,  isActive: true  },
  { name: 'Kiran Malhotra', email: 'kiran.malhotra@gmail.com', phone: '9876543218', policyAccepted: false, isActive: true  },
  { name: 'Deepak Patel',   email: 'deepak.patel@gmail.com',   phone: '9876543219', policyAccepted: false, isActive: false },
];

// Users who will have orders (indices 0–7, i.e. first 8 USERS)
const ORDER_USER_EMAILS = USERS.slice(0, 8).map(u => u.email);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calcOrder(
  plants: { pricePerDay: number; depositAmount: number; qty: number }[],
  startDate: Date,
  endDate: Date
) {
  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const deposit = plants.reduce((s, p) => s + p.depositAmount * p.qty, 0);
  const rentalTotal = plants.reduce((s, p) => s + p.pricePerDay * p.qty * days, 0);
  return { totalPrice: rentalTotal + deposit, deposit };
}

// ─── Stage 1: Seed admins ─────────────────────────────────────────────────────

async function seedAdmins(): Promise<{ created: number; skipped: number }> {
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
  let created = 0;
  let skipped = 0;

  for (const a of ADMINS) {
    const exists = await User.findOne({ email: a.email });
    if (exists) { skipped++; continue; }
    await User.create({ name: a.name, email: a.email, password: hashed, role: a.role, policyAccepted: false, isActive: true });
    created++;
  }

  return { created, skipped };
}

// ─── Stage 2: Seed regular users ─────────────────────────────────────────────

async function seedRegularUsers(): Promise<{ idMap: Map<string, mongoose.Types.ObjectId>; created: number; skipped: number }> {
  const hashed = await bcrypt.hash(USER_PASSWORD, 12);
  let created = 0;
  let skipped = 0;
  const idMap = new Map<string, mongoose.Types.ObjectId>();

  for (const u of USERS) {
    let doc = await User.findOne({ email: u.email });
    if (doc) {
      skipped++;
    } else {
      doc = await User.create({
        name: u.name,
        email: u.email,
        password: hashed,
        phone: u.phone,
        role: 'user',
        policyAccepted: u.policyAccepted,
        isActive: u.isActive,
      });
      created++;
    }
    idMap.set(u.email, doc._id as mongoose.Types.ObjectId);
  }

  return { idMap, created, skipped };
}

// ─── Stage 3: Assert plants exist ────────────────────────────────────────────

async function assertPlantsExist(): Promise<Map<string, { id: mongoose.Types.ObjectId; pricePerDay: number; depositAmount: number }>> {
  const plants = await Plant.find({ isDeleted: false });
  if (plants.length === 0) {
    console.error('\n[ERROR] No plants found in the database.');
    console.error('        Please run `npx ts-node src/seed.ts` first, then re-run this script.\n');
    process.exit(1);
  }

  const map = new Map<string, { id: mongoose.Types.ObjectId; pricePerDay: number; depositAmount: number }>();
  for (const p of plants) {
    map.set(p.name, { id: p._id as mongoose.Types.ObjectId, pricePerDay: p.pricePerDay, depositAmount: p.depositAmount });
  }
  return map;
}

// ─── Stage 4: Seed addresses ──────────────────────────────────────────────────

async function seedAddresses(
  userIdMap: Map<string, mongoose.Types.ObjectId>
): Promise<{ created: number; skipped: number }> {
  const userIds = ORDER_USER_EMAILS.map(e => userIdMap.get(e)!);
  const existingCount = await Address.countDocuments({ userId: { $in: userIds }, isDeleted: false });
  if (existingCount > 0) {
    return { created: 0, skipped: existingCount };
  }

  const addressData = [
    // Arjun Kapoor
    { email: 'arjun.kapoor@gmail.com', label: 'Home', recipientName: 'Arjun Kapoor', phone: '9876543210', addressLine1: '12, Sea Breeze Apartments', addressLine2: 'Linking Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', isDefault: true },
    { email: 'arjun.kapoor@gmail.com', label: 'Office', recipientName: 'Arjun Kapoor', phone: '9876543210', addressLine1: '501, Infinity Tower', addressLine2: 'Andheri East', city: 'Mumbai', state: 'Maharashtra', pincode: '400069', isDefault: false },
    // Meera Iyer
    { email: 'meera.iyer@gmail.com', label: 'Home', recipientName: 'Meera Iyer', phone: '9876543211', addressLine1: '34, Sunrise Layout', addressLine2: 'Koramangala 5th Block', city: 'Bengaluru', state: 'Karnataka', pincode: '560095', isDefault: true },
    { email: 'meera.iyer@gmail.com', label: 'Office', recipientName: 'Meera Iyer', phone: '9876543211', addressLine1: 'ITPL Main Road, Block B', addressLine2: 'Whitefield', city: 'Bengaluru', state: 'Karnataka', pincode: '560066', isDefault: false },
    // Vikram Bose
    { email: 'vikram.bose@gmail.com', label: 'Home', recipientName: 'Vikram Bose', phone: '9876543212', addressLine1: 'CF-7, Salt Lake City', addressLine2: 'Sector III', city: 'Kolkata', state: 'West Bengal', pincode: '700106', isDefault: true },
    { email: 'vikram.bose@gmail.com', label: 'Office', recipientName: 'Vikram Bose', phone: '9876543212', addressLine1: '22, Park Street', addressLine2: '', city: 'Kolkata', state: 'West Bengal', pincode: '700016', isDefault: false },
    // Pooja Reddy
    { email: 'pooja.reddy@gmail.com', label: 'Home', recipientName: 'Pooja Reddy', phone: '9876543213', addressLine1: '8-2-293/82/A, Road No. 10', addressLine2: 'Jubilee Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500033', isDefault: true },
    { email: 'pooja.reddy@gmail.com', label: 'Office', recipientName: 'Pooja Reddy', phone: '9876543213', addressLine1: 'Q City, Nanakramguda', addressLine2: 'HITEC City', city: 'Hyderabad', state: 'Telangana', pincode: '500032', isDefault: false },
    // Rahul Joshi
    { email: 'rahul.joshi@gmail.com', label: 'Home', recipientName: 'Rahul Joshi', phone: '9876543214', addressLine1: 'B-14, Connaught Place', addressLine2: '', city: 'New Delhi', state: 'Delhi', pincode: '110001', isDefault: true },
    { email: 'rahul.joshi@gmail.com', label: 'Office', recipientName: 'Rahul Joshi', phone: '9876543214', addressLine1: 'Shop 12, Lajpat Nagar Market', addressLine2: '', city: 'New Delhi', state: 'Delhi', pincode: '110024', isDefault: false },
    // Ananya Das
    { email: 'ananya.das@gmail.com', label: 'Home', recipientName: 'Ananya Das', phone: '9876543215', addressLine1: '45, Alipore Avenue', addressLine2: '', city: 'Kolkata', state: 'West Bengal', pincode: '700027', isDefault: true },
    { email: 'ananya.das@gmail.com', label: 'Office', recipientName: 'Ananya Das', phone: '9876543215', addressLine1: 'Action Area 1, New Town', addressLine2: 'Rajarhat', city: 'Kolkata', state: 'West Bengal', pincode: '700156', isDefault: false },
    // Siddharth Rao
    { email: 'sid.rao@gmail.com', label: 'Home', recipientName: 'Siddharth Rao', phone: '9876543216', addressLine1: '100 Feet Road, HAL 2nd Stage', addressLine2: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', isDefault: true },
    { email: 'sid.rao@gmail.com', label: 'Office', recipientName: 'Siddharth Rao', phone: '9876543216', addressLine1: '19th Main, 4th Block', addressLine2: 'Jayanagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560011', isDefault: false },
    // Nisha Gupta
    { email: 'nisha.gupta@gmail.com', label: 'Home', recipientName: 'Nisha Gupta', phone: '9876543217', addressLine1: 'A-302, Shivalik Apartments', addressLine2: 'Satellite', city: 'Ahmedabad', state: 'Gujarat', pincode: '380015', isDefault: true },
    { email: 'nisha.gupta@gmail.com', label: 'Office', recipientName: 'Nisha Gupta', phone: '9876543217', addressLine1: 'Shyamal Cross Road', addressLine2: 'Vastrapur', city: 'Ahmedabad', state: 'Gujarat', pincode: '380054', isDefault: false },
  ];

  const docs = addressData.map(a => ({
    userId: userIdMap.get(a.email)!,
    label: a.label,
    recipientName: a.recipientName,
    phone: a.phone,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: a.isDefault,
    isDeleted: false,
  }));

  await Address.insertMany(docs);
  return { created: docs.length, skipped: 0 };
}

// ─── Stage 5: Seed orders ─────────────────────────────────────────────────────

interface OrderDoc {
  userId: mongoose.Types.ObjectId;
  plants: { plantId: mongoose.Types.ObjectId; quantity: number }[];
  rentalStartDate: Date;
  rentalEndDate: Date;
  totalPrice: number;
  deposit: number;
  deliveryAddress: string;
  status: 'booked' | 'delivered' | 'picked';
  damageStatus: 'none' | 'minor' | 'major';
  depositRefunded: boolean;
  policyAccepted: true;
  paymentStatus: 'pending' | 'paid' | 'failed';
  razorpayOrderId: string | null;
  isDeleted: boolean;
}

async function seedOrders(
  userIdMap: Map<string, mongoose.Types.ObjectId>,
  plantMap: Map<string, { id: mongoose.Types.ObjectId; pricePerDay: number; depositAmount: number }>
): Promise<{ docs: mongoose.Document[]; created: number; skipped: number }> {
  const userIds = ORDER_USER_EMAILS.map(e => userIdMap.get(e)!);
  const existingCount = await Order.countDocuments({ userId: { $in: userIds }, isDeleted: false });
  if (existingCount > 0) {
    return { docs: [], created: 0, skipped: existingCount };
  }

  const p = (name: string) => plantMap.get(name)!;

  // Helper to build an order record
  const mkOrder = (
    email: string,
    plantItems: { name: string; qty: number }[],
    startDate: Date,
    endDate: Date,
    status: OrderDoc['status'],
    paymentStatus: OrderDoc['paymentStatus'],
    damageStatus: OrderDoc['damageStatus'],
    depositRefunded: boolean
  ): OrderDoc => {
    const plantData = plantItems.map(pi => ({ pricePerDay: p(pi.name).pricePerDay, depositAmount: p(pi.name).depositAmount, qty: pi.qty }));
    const { totalPrice, deposit } = calcOrder(plantData, startDate, endDate);
    return {
      userId: userIdMap.get(email)!,
      plants: plantItems.map(pi => ({ plantId: p(pi.name).id, quantity: pi.qty })),
      rentalStartDate: startDate,
      rentalEndDate: endDate,
      totalPrice,
      deposit,
      deliveryAddress: '12, Sea Breeze Apartments, Mumbai, Maharashtra 400050',
      status,
      damageStatus,
      depositRefunded,
      policyAccepted: true,
      paymentStatus,
      razorpayOrderId: paymentStatus !== 'pending' ? `order_seed_${String(Math.random()).slice(2, 10)}` : null,
      isDeleted: false,
    };
  };

  const orders: OrderDoc[] = [
    // Arjun Kapoor — 3 orders
    mkOrder('arjun.kapoor@gmail.com', [{ name: 'Peace Lily', qty: 1 }],                              daysAgo(60), daysAgo(30), 'picked',    'paid',    'none',  true),
    mkOrder('arjun.kapoor@gmail.com', [{ name: 'Snake Plant', qty: 2 }],                             daysAgo(15), daysAgo(5),  'picked',    'paid',    'minor', false),
    mkOrder('arjun.kapoor@gmail.com', [{ name: 'Areca Palm', qty: 1 }, { name: 'Anthurium', qty: 1 }], daysAgo(50), daysAgo(35), 'picked', 'paid',    'minor', false),

    // Meera Iyer — 3 orders
    mkOrder('meera.iyer@gmail.com',   [{ name: 'Monstera Deliciosa', qty: 1 }, { name: 'Pothos', qty: 2 }], daysAgo(30), daysAgo(10), 'picked', 'paid', 'none', true),
    mkOrder('meera.iyer@gmail.com',   [{ name: 'Bird of Paradise', qty: 1 }],                        new Date(), daysFromNow(14), 'delivered', 'paid',    'none',  false),
    mkOrder('meera.iyer@gmail.com',   [{ name: 'Boston Fern', qty: 1 }],                             daysAgo(2),  daysFromNow(12), 'booked',    'failed',  'none',  false),

    // Vikram Bose — 2 orders
    mkOrder('vikram.bose@gmail.com',  [{ name: 'Fiddle Leaf Fig', qty: 1 }],                         daysFromNow(7), daysFromNow(21), 'booked', 'paid',   'none',  false),
    mkOrder('vikram.bose@gmail.com',  [{ name: 'Aloe Vera', qty: 2 }],                               daysAgo(5),  new Date(),       'delivered', 'paid',  'none',  false),

    // Pooja Reddy — 2 orders
    mkOrder('pooja.reddy@gmail.com',  [{ name: 'Rubber Plant', qty: 1 }],                            daysAgo(45), daysAgo(25), 'picked',    'paid',    'major', false),
    mkOrder('pooja.reddy@gmail.com',  [{ name: 'Areca Palm', qty: 1 }],                              new Date(),  daysFromNow(10), 'booked',  'pending', 'none',  false),

    // Rahul Joshi — 2 orders
    mkOrder('rahul.joshi@gmail.com',  [{ name: 'Anthurium', qty: 1 }, { name: 'ZZ Plant', qty: 1 }], daysAgo(20), daysAgo(3),  'picked',   'paid',    'none',  true),
    mkOrder('rahul.joshi@gmail.com',  [{ name: 'Boston Fern', qty: 2 }],                             daysFromNow(3), daysFromNow(17), 'booked', 'failed', 'none', false),

    // Ananya Das — 2 orders
    mkOrder('ananya.das@gmail.com',   [{ name: 'Peace Lily', qty: 1 }, { name: 'Pothos', qty: 1 }],  daysAgo(10), new Date(),       'delivered', 'paid',  'minor', false),
    mkOrder('ananya.das@gmail.com',   [{ name: 'Monstera Deliciosa', qty: 1 }],                      daysFromNow(5), daysFromNow(25), 'booked',  'pending', 'none', false),

    // Siddharth Rao — 2 orders
    mkOrder('sid.rao@gmail.com',      [{ name: 'Snake Plant', qty: 1 }],                             daysAgo(90), daysAgo(75), 'picked',    'paid',    'none',  true),
    mkOrder('sid.rao@gmail.com',      [{ name: 'Bird of Paradise', qty: 1 }],                        daysAgo(8),  daysFromNow(2), 'delivered', 'paid',  'none',  false),

    // Nisha Gupta — 2 orders
    mkOrder('nisha.gupta@gmail.com',  [{ name: 'Rubber Plant', qty: 1 }, { name: 'ZZ Plant', qty: 2 }], daysAgo(3), daysFromNow(7), 'delivered', 'paid', 'none', false),
    mkOrder('nisha.gupta@gmail.com',  [{ name: 'Fiddle Leaf Fig', qty: 1 }],                         daysFromNow(10), daysFromNow(30), 'booked', 'pending', 'none', false),
  ];

  const inserted = await Order.insertMany(orders);
  return { docs: inserted as unknown as mongoose.Document[], created: inserted.length, skipped: 0 };
}

// ─── Stage 6: Seed payments ───────────────────────────────────────────────────

async function seedPayments(
  orderDocs: mongoose.Document[]
): Promise<{ created: number; skipped: number }> {
  if (orderDocs.length === 0) {
    // Orders were already seeded — skip payments too (assume they exist)
    const count = await Payment.countDocuments({});
    return { created: 0, skipped: count };
  }

  const paymentDocs: object[] = [];
  let idx = 1;

  for (const doc of orderDocs) {
    const order = doc as unknown as {
      _id: mongoose.Types.ObjectId;
      userId: mongoose.Types.ObjectId;
      paymentStatus: string;
      totalPrice: number;
      razorpayOrderId: string | null;
    };

    if (order.paymentStatus === 'pending') continue; // No payment record for pending

    const razorpayOrderId = order.razorpayOrderId ?? `order_seed_${String(idx).padStart(3, '0')}`;
    const razorpayPaymentId = order.paymentStatus === 'paid' ? `pay_seed_${String(idx).padStart(3, '0')}` : null;

    paymentDocs.push({
      orderId: order._id,
      userId: order.userId,
      razorpayOrderId,
      razorpayPaymentId,
      amount: order.totalPrice,
      currency: 'INR',
      status: order.paymentStatus,
    });

    idx++;
  }

  if (paymentDocs.length === 0) return { created: 0, skipped: 0 };

  await Payment.insertMany(paymentDocs);
  return { created: paymentDocs.length, skipped: 0 };
}

// ─── Stage 7: Seed carts ─────────────────────────────────────────────────────

async function seedCarts(
  userIdMap: Map<string, mongoose.Types.ObjectId>,
  plantMap: Map<string, { id: mongoose.Types.ObjectId; pricePerDay: number; depositAmount: number }>
): Promise<{ created: number; skipped: number }> {
  const cartUsers = [
    { email: 'kiran.malhotra@gmail.com', items: [
      { name: 'Peace Lily',  qty: 1, start: daysFromNow(5),  end: daysFromNow(15) },
      { name: 'Pothos',      qty: 2, start: daysFromNow(5),  end: daysFromNow(15) },
    ]},
    { email: 'ananya.das@gmail.com', items: [
      { name: 'ZZ Plant',    qty: 1, start: daysFromNow(3),  end: daysFromNow(10) },
    ]},
    { email: 'deepak.patel@gmail.com', items: [
      { name: 'Snake Plant', qty: 1, start: daysFromNow(7),  end: daysFromNow(21) },
      { name: 'Aloe Vera',   qty: 2, start: daysFromNow(7),  end: daysFromNow(21) },
    ]},
    { email: 'rahul.joshi@gmail.com', items: [
      { name: 'Anthurium',   qty: 1, start: daysFromNow(10), end: daysFromNow(20) },
    ]},
  ];

  let created = 0;
  let skipped = 0;

  for (const cu of cartUsers) {
    const userId = userIdMap.get(cu.email)!;
    const exists = await Cart.findOne({ userId });
    if (exists) { skipped++; continue; }

    await Cart.create({
      userId,
      items: cu.items.map(i => ({
        plantId: plantMap.get(i.name)!.id,
        quantity: i.qty,
        rentalStartDate: i.start,
        rentalEndDate: i.end,
      })),
    });
    created++;
  }

  return { created, skipped };
}

// ─── Stage 8: Seed wishlists ──────────────────────────────────────────────────

async function seedWishlists(
  userIdMap: Map<string, mongoose.Types.ObjectId>,
  plantMap: Map<string, { id: mongoose.Types.ObjectId; pricePerDay: number; depositAmount: number }>
): Promise<{ created: number; skipped: number }> {
  const wishlistUsers = [
    { email: 'kiran.malhotra@gmail.com', plants: ['Monstera Deliciosa', 'Bird of Paradise', 'Fiddle Leaf Fig'] },
    { email: 'sid.rao@gmail.com',         plants: ['Areca Palm', 'Anthurium'] },
    { email: 'pooja.reddy@gmail.com',     plants: ['Peace Lily', 'ZZ Plant', 'Boston Fern'] },
    { email: 'nisha.gupta@gmail.com',     plants: ['Snake Plant', 'Pothos'] },
  ];

  let created = 0;
  let skipped = 0;

  for (const wu of wishlistUsers) {
    const userId = userIdMap.get(wu.email)!;
    const exists = await Wishlist.findOne({ userId });
    if (exists) { skipped++; continue; }

    await Wishlist.create({
      userId,
      plants: wu.plants.map(name => ({ plantId: plantMap.get(name)!.id })),
    });
    created++;
  }

  return { created, skipped };
}

// ─── Summary printer ─────────────────────────────────────────────────────────

function printSummary(counts: {
  admins: { created: number; skipped: number };
  users: { created: number; skipped: number };
  addresses: { created: number; skipped: number };
  orders: { created: number; skipped: number };
  payments: { created: number; skipped: number };
  carts: { created: number; skipped: number };
  wishlists: { created: number; skipped: number };
}) {
  const line = '='.repeat(70);
  const div  = '-'.repeat(70);

  console.log('\n' + line);
  console.log('  PLANT RENTAL PLATFORM — SEED SUMMARY');
  console.log(line);

  console.log('\nADMIN ACCOUNTS  (password: Admin@1234)');
  console.log(div);
  console.log(`${'Role'.padEnd(18)} | ${'Email'.padEnd(38)} | Password`);
  console.log(div);
  for (const a of ADMINS) {
    console.log(`${a.role.padEnd(18)} | ${a.email.padEnd(38)} | ${ADMIN_PASSWORD}`);
  }
  console.log(div);

  console.log('\nREGULAR USER ACCOUNTS  (password: User@1234)');
  console.log(div);
  console.log(`${'Name'.padEnd(20)} | ${'Email'.padEnd(32)} | ${'Policy'.padEnd(7)} | Active`);
  console.log(div);
  for (const u of USERS) {
    const policy = u.policyAccepted ? 'YES' : 'NO ';
    const active = u.isActive ? 'YES' : 'NO ';
    console.log(`${u.name.padEnd(20)} | ${u.email.padEnd(32)} | ${policy.padEnd(7)} | ${active}`);
  }
  console.log(div);

  console.log('\nSEEDED COUNTS');
  console.log(div);
  const fmt = (label: string, c: { created: number; skipped: number }) =>
    `${label.padEnd(16)}: ${String(c.created).padStart(3)} created, ${String(c.skipped).padStart(3)} skipped`;
  console.log(fmt('Admin users',   counts.admins));
  console.log(fmt('Regular users', counts.users));
  console.log(fmt('Addresses',     counts.addresses));
  console.log(fmt('Orders',        counts.orders));
  console.log(fmt('Payments',      counts.payments));
  console.log(fmt('Carts',         counts.carts));
  console.log(fmt('Wishlists',     counts.wishlists));
  console.log(div);

  console.log('\nNOTE: Save these credentials — passwords are hashed in the database.');
  console.log(line + '\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seedAll() {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('MONGO_URI is not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n');

  console.log('[1/8] Seeding admin users...');
  const admins = await seedAdmins();
  console.log(`      ✓ ${admins.created} created, ${admins.skipped} skipped`);

  console.log('[2/8] Seeding regular users...');
  const { idMap: userIdMap, ...users } = await seedRegularUsers();
  console.log(`      ✓ ${users.created} created, ${users.skipped} skipped`);

  console.log('[3/8] Verifying plants...');
  const plantMap = await assertPlantsExist();
  console.log(`      ✓ ${plantMap.size} plants found`);

  console.log('[4/8] Seeding addresses...');
  const addresses = await seedAddresses(userIdMap);
  console.log(`      ✓ ${addresses.created} created, ${addresses.skipped} skipped`);

  console.log('[5/8] Seeding orders...');
  const orders = await seedOrders(userIdMap, plantMap);
  console.log(`      ✓ ${orders.created} created, ${orders.skipped} skipped`);

  console.log('[6/8] Seeding payments...');
  const payments = await seedPayments(orders.docs);
  console.log(`      ✓ ${payments.created} created, ${payments.skipped} skipped`);

  console.log('[7/8] Seeding carts...');
  const carts = await seedCarts(userIdMap, plantMap);
  console.log(`      ✓ ${carts.created} created, ${carts.skipped} skipped`);

  console.log('[8/8] Seeding wishlists...');
  const wishlists = await seedWishlists(userIdMap, plantMap);
  console.log(`      ✓ ${wishlists.created} created, ${wishlists.skipped} skipped`);

  printSummary({ admins, users, addresses, orders, payments, carts, wishlists });

  await mongoose.disconnect();
}

seedAll().catch(err => {
  console.error('seedAll failed:', err);
  process.exit(1);
});
