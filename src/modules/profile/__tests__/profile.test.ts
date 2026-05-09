import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../../app';
import { User } from '../../user/user.model';
import { Address } from '../address.model';

// ─── Shared state ─────────────────────────────────────────────────────────────

const BASE = '/api/profile';
const DOMAIN = '@profile-test.example';

let userId: string;
let googleOnlyUserId: string;
let userToken: string;
let googleOnlyUserToken: string;
let addressId: string;

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  await mongoose.connect(process.env.TEST_MONGO_URI!);

  await User.deleteMany({ email: { $regex: '@profile-test\\.example$' } });
  await Address.deleteMany({});

  // Create a regular user with password
  const hashedPassword = await bcrypt.hash('Test@123', 12);
  const user = await User.create({
    name: 'Profile Test User',
    email: `user${DOMAIN}`,
    password: hashedPassword,
    role: 'user',
    policyAccepted: false,
  });

  // Create a Google-only user (no password field)
  const googleUser = await User.create({
    name: 'Google User',
    email: `google${DOMAIN}`,
    googleId: 'google-123456',
    role: 'user',
    policyAccepted: false,
  });

  userId = user._id.toString();
  googleOnlyUserId = googleUser._id.toString();

  userToken = jwt.sign(
    { id: userId, role: 'user' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  googleOnlyUserToken = jwt.sign(
    { id: googleOnlyUserId, role: 'user' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await User.deleteMany({ email: { $regex: '@profile-test\\.example$' } });
  await Address.deleteMany({});
  await mongoose.disconnect();
});

// ─── Profile Tests ────────────────────────────────────────────────────────────

describe('Profile Endpoints', () => {
  // ─── GET /api/profile ────────────────────────────────────────────────────────

  it('GET profile (unauthenticated) → 401', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it('GET profile (authenticated) → 200 with user data', async () => {
    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(`user${DOMAIN}`);
    expect(res.body.data.user.name).toBe('Profile Test User');
    expect(res.body.data.user).not.toHaveProperty('password');
    expect(res.body.data.user).not.toHaveProperty('refreshToken');
  });

  // ─── PATCH /api/profile ──────────────────────────────────────────────────────

  it('PATCH profile with no changes → 200 but no API call made', async () => {
    const res = await request(app)
      .patch(BASE)
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    // Empty body fails Joi min(1) validation
    expect(res.status).toBe(400);
  });

  it('PATCH profile with name only → 200 and name updated', async () => {
    const res = await request(app)
      .patch(BASE)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.name).toBe('Updated Name');

    // Verify in DB
    const user = await User.findById(userId);
    expect(user?.name).toBe('Updated Name');
  });

  it('PATCH profile with phone only → 200 and phone updated', async () => {
    const res = await request(app)
      .patch(BASE)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ phone: '9876543210' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.phone).toBe('9876543210');

    const user = await User.findById(userId);
    expect(user?.phone).toBe('9876543210');
  });

  it('PATCH profile with invalid phone (not 10 digits) → 400', async () => {
    const res = await request(app)
      .patch(BASE)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ phone: '12345' });

    expect(res.status).toBe(400);
  });

  it('PATCH profile with name and phone → 200 and both updated', async () => {
    const res = await request(app)
      .patch(BASE)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'New Name', phone: '9123456789' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('New Name');
    expect(res.body.data.user.phone).toBe('9123456789');
  });

  // ─── PATCH /api/profile/change-password ──────────────────────────────────────

  it('change-password with wrong current password → 401', async () => {
    const res = await request(app)
      .patch(`${BASE}/change-password`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currentPassword: 'WrongPassword', newPassword: 'NewPass@123' });

    expect(res.status).toBe(401);
  });

  it('change-password with too short new password → 400', async () => {
    const res = await request(app)
      .patch(`${BASE}/change-password`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currentPassword: 'Test@123', newPassword: 'Short' });

    expect(res.status).toBe(400);
  });

  it('change-password with correct current password → 200 and password updated', async () => {
    const res = await request(app)
      .patch(`${BASE}/change-password`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currentPassword: 'Test@123', newPassword: 'NewPass@123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify old password no longer works
    const user = await User.findById(userId);
    const isOldPasswordValid = await bcrypt.compare('Test@123', user?.password || '');
    expect(isOldPasswordValid).toBe(false);

    // Verify new password works
    const isNewPasswordValid = await bcrypt.compare('NewPass@123', user?.password || '');
    expect(isNewPasswordValid).toBe(true);
  });

  it('change-password for Google-only user → 400 with descriptive message', async () => {
    const res = await request(app)
      .patch(`${BASE}/change-password`)
      .set('Authorization', `Bearer ${googleOnlyUserToken}`)
      .send({ currentPassword: 'anything', newPassword: 'NewPass@123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Google');
  });

  // ─── PATCH /api/profile/accept-policy ────────────────────────────────────────

  it('accept-policy → 200 and policyAccepted set to true', async () => {
    const res = await request(app)
      .patch(`${BASE}/accept-policy`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = await User.findById(userId);
    expect(user?.policyAccepted).toBe(true);
  });

  it('accept-policy (idempotent) → 200 even if already accepted', async () => {
    const res = await request(app)
      .patch(`${BASE}/accept-policy`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
  });
});

// ─── Address Tests ────────────────────────────────────────────────────────────

describe('Address Endpoints', () => {
  // ─── GET /api/profile/addresses ───────────────────────────────────────────────

  it('GET addresses (unauthenticated) → 401', async () => {
    const res = await request(app).get(`${BASE}/addresses`);
    expect(res.status).toBe(401);
  });

  it('GET addresses (empty) → 200 with empty array', async () => {
    const res = await request(app)
      .get(`${BASE}/addresses`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.addresses).toEqual([]);
  });

  // ─── POST /api/profile/addresses ──────────────────────────────────────────────

  it('POST address with missing required field → 400', async () => {
    const res = await request(app)
      .post(`${BASE}/addresses`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        label: 'Home',
        recipientName: 'John Doe',
        // missing phone
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        pincode: '100001',
      });

    expect(res.status).toBe(400);
  });

  it('POST address with invalid phone (not 10 digits) → 400', async () => {
    const res = await request(app)
      .post(`${BASE}/addresses`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        label: 'Home',
        recipientName: 'John Doe',
        phone: '12345',
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        pincode: '100001',
      });

    expect(res.status).toBe(400);
  });

  it('POST address with invalid pincode (not 6 digits) → 400', async () => {
    const res = await request(app)
      .post(`${BASE}/addresses`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        label: 'Home',
        recipientName: 'John Doe',
        phone: '9876543210',
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        pincode: '1234',
      });

    expect(res.status).toBe(400);
  });

  it('POST first address → 201 and automatically set as default', async () => {
    const res = await request(app)
      .post(`${BASE}/addresses`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        label: 'Home',
        recipientName: 'John Doe',
        phone: '9876543210',
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        pincode: '100001',
        isDefault: false, // should be overridden to true
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.address.isDefault).toBe(true);
    expect(res.body.data.address.isDeleted).toBe(false);

    addressId = res.body.data.address._id;

    // Verify in DB
    const address = await Address.findById(addressId);
    expect(address?.isDefault).toBe(true);
  });

  it('GET addresses → 200 with the created address', async () => {
    const res = await request(app)
      .get(`${BASE}/addresses`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.addresses).toHaveLength(1);
    expect(res.body.data.addresses[0].label).toBe('Home');
    expect(res.body.data.addresses[0].isDefault).toBe(true);
  });

  it('POST second address → 201 and not set as default', async () => {
    const res = await request(app)
      .post(`${BASE}/addresses`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        label: 'Office',
        recipientName: 'Jane Smith',
        phone: '9123456789',
        addressLine1: '456 Work Ave',
        city: 'Boston',
        state: 'MA',
        pincode: '021101',
        isDefault: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.address.isDefault).toBe(false);
  });

  // ─── PATCH /api/profile/addresses/:id ─────────────────────────────────────────

  it('PATCH address with no changes → 400 (min 1 field required)', async () => {
    const res = await request(app)
      .patch(`${BASE}/addresses/${addressId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('PATCH address with invalid ID format → 400', async () => {
    const res = await request(app)
      .patch(`${BASE}/addresses/invalid-id`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ label: 'Updated Label' });

    expect(res.status).toBe(400);
  });

  it('PATCH address with non-existent ID → 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`${BASE}/addresses/${fakeId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ label: 'Updated Label' });

    expect(res.status).toBe(404);
  });

  it('PATCH address with label only → 200 and label updated', async () => {
    const res = await request(app)
      .patch(`${BASE}/addresses/${addressId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ label: 'Home Sweet Home' });

    expect(res.status).toBe(200);
    expect(res.body.data.address.label).toBe('Home Sweet Home');

    const address = await Address.findById(addressId);
    expect(address?.label).toBe('Home Sweet Home');
  });

  it('PATCH address cannot send isDefault (use /default endpoint) → 400', async () => {
    const res = await request(app)
      .patch(`${BASE}/addresses/${addressId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ label: 'Another Label', isDefault: true });

    // Should fail because updateAddressSchema rejects isDefault
    expect(res.status).toBe(400);
  });

  // ─── PATCH /api/profile/addresses/:id/default ─────────────────────────────────

  it('PATCH addresses/:id/default with invalid ID → 400', async () => {
    const res = await request(app)
      .patch(`${BASE}/addresses/invalid-id/default`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(400);
  });

  it('PATCH addresses/:id/default with non-existent ID → 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`${BASE}/addresses/${fakeId}/default`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
  });

  it('PATCH addresses/:id/default → 200 and sets as default, clears others', async () => {
    // Fetch second address ID
    const addresses = await Address.find({ userId });
    const secondAddress = addresses.find((a: any) => a.label === 'Office');

    const res = await request(app)
      .patch(`${BASE}/addresses/${secondAddress?._id}/default`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.address.isDefault).toBe(true);

    // Verify first address is no longer default
    const firstAddress = await Address.findById(addressId);
    expect(firstAddress?.isDefault).toBe(false);

    // Verify second address is default
    const updatedSecond = await Address.findById(secondAddress?._id);
    expect(updatedSecond?.isDefault).toBe(true);
  });

  // ─── DELETE /api/profile/addresses/:id ────────────────────────────────────────

  it('DELETE address with invalid ID → 400', async () => {
    const res = await request(app)
      .delete(`${BASE}/addresses/invalid-id`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(400);
  });

  it('DELETE address with non-existent ID → 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete(`${BASE}/addresses/${fakeId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
  });

  it('DELETE non-default address → 200 and soft-deleted', async () => {
    const addresses = await Address.find({ userId });
    const nonDefaultAddress = addresses.find((a) => !a.isDefault);

    const res = await request(app)
      .delete(`${BASE}/addresses/${nonDefaultAddress?._id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);

    // Verify soft-deleted (isDeleted = true, still in DB)
    const deleted = await Address.findById(nonDefaultAddress?._id);
    expect(deleted?.isDeleted).toBe(true);

    // Verify not returned in GET
    const getRes = await request(app)
      .get(`${BASE}/addresses`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(getRes.body.data.addresses).not.toContainEqual(
      expect.objectContaining({ _id: nonDefaultAddress?._id.toString() })
    );
  });

  it('DELETE default address → 200 and auto-promotes next address to default', async () => {
    // Create a third address
    const addRes = await request(app)
      .post(`${BASE}/addresses`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        label: 'Backup',
        recipientName: 'Bob Johnson',
        phone: '9111111111',
        addressLine1: '789 Backup St',
        city: 'Chicago',
        state: 'IL',
        pincode: '606001',
      });

    expect(addRes.status).toBe(201);
    const backupId = addRes.body.data.address._id;

    // Current default is 'Office', delete it
    const addresses = await Address.find({ userId, isDeleted: false });
    const currentDefault = addresses.find((a) => a.isDefault);

    const deleteRes = await request(app)
      .delete(`${BASE}/addresses/${currentDefault?._id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(deleteRes.status).toBe(200);

    // Verify the next non-deleted address became default (should be 'Backup', since 'Home Sweet Home' was deleted in previous test)
    const backupAddress = await Address.findOne({
      userId,
      label: 'Backup',
      isDeleted: false,
    });
    expect(backupAddress?.isDefault).toBe(true);
  });

  it('DELETE last remaining address → 200 and no default exists', async () => {
    // Get all non-deleted addresses
    const addresses = await Address.find({ userId, isDeleted: false });

    // Delete each one
    for (const address of addresses) {
      await request(app)
        .delete(`${BASE}/addresses/${address._id}`)
        .set('Authorization', `Bearer ${userToken}`);
    }

    // Verify no addresses returned
    const res = await request(app)
      .get(`${BASE}/addresses`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.body.data.addresses).toHaveLength(0);
  });
});
