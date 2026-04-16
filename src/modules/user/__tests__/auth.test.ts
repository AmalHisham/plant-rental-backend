import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../../app';
import { User } from '../models/user.model';
import { sendPasswordResetEmail } from '../service/email.service';

// ─── Mock email service so no real emails are sent ───────────────────────────

jest.mock('../service/email.service', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockSendEmail = sendPasswordResetEmail as jest.Mock;

// ─── Shared state (set by earlier tests, used by later ones) ─────────────────

const BASE = '/api/auth';
const DOMAIN = '@auth-test.example';
const email = `user${DOMAIN}`;
const password = 'Password123';
const name = 'Auth Test User';

let accessToken: string;
let refreshToken: string;

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  await mongoose.connect(process.env.TEST_MONGO_URI!);
  // Clean slate — remove any leftover data from a previous run
  await User.deleteMany({ email: { $regex: '@auth-test\\.example$' } });
});

afterAll(async () => {
  await User.deleteMany({ email: { $regex: '@auth-test\\.example$' } });
  await mongoose.disconnect();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── 1. Register success ──────────────────────────────────────────────────────

it('1. Register success → 201 + accessToken + refreshToken', async () => {
  const res = await request(app)
    .post(`${BASE}/register`)
    .send({ name, email, password });

  expect(res.status).toBe(201);
  expect(res.body.success).toBe(true);
  expect(res.body.data.accessToken).toBeDefined();
  expect(res.body.data.refreshToken).toBeDefined();
  expect(res.body.data.user.email).toBe(email);

  accessToken = res.body.data.accessToken;
  refreshToken = res.body.data.refreshToken;
});

// ─── 2. Register duplicate email ──────────────────────────────────────────────

it('2. Register duplicate email → 409', async () => {
  const res = await request(app)
    .post(`${BASE}/register`)
    .send({ name, email, password });

  expect(res.status).toBe(409);
  expect(res.body.success).toBe(false);
});

// ─── 3. Register empty body ───────────────────────────────────────────────────

it('3. Register empty body → 400', async () => {
  const res = await request(app).post(`${BASE}/register`).send({});
  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
});

// ─── 4. Login success ─────────────────────────────────────────────────────────

it('4. Login success → 200 + accessToken + refreshToken', async () => {
  const res = await request(app)
    .post(`${BASE}/login`)
    .send({ email, password });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.accessToken).toBeDefined();
  expect(res.body.data.refreshToken).toBeDefined();

  // Refresh tokens for subsequent tests
  accessToken = res.body.data.accessToken;
  refreshToken = res.body.data.refreshToken;
});

// ─── 5. Login wrong password ──────────────────────────────────────────────────

it('5. Login wrong password → 401', async () => {
  const res = await request(app)
    .post(`${BASE}/login`)
    .send({ email, password: 'WrongPassword9' });

  expect(res.status).toBe(401);
  expect(res.body.success).toBe(false);
});

// ─── 6. Login wrong email ─────────────────────────────────────────────────────

it('6. Login wrong email → 401', async () => {
  const res = await request(app)
    .post(`${BASE}/login`)
    .send({ email: `nobody${DOMAIN}`, password });

  expect(res.status).toBe(401);
  expect(res.body.success).toBe(false);
});

// ─── 7. Forgot password — existing email ──────────────────────────────────────

it('7. Forgot password existing email → 200 + email sent', async () => {
  const res = await request(app)
    .post(`${BASE}/forgot-password`)
    .send({ email });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(mockSendEmail).toHaveBeenCalledTimes(1);
});

// ─── 8. Forgot password — non-existing email ──────────────────────────────────

it('8. Forgot password non-existing email → 200 (same response, no email)', async () => {
  const res = await request(app)
    .post(`${BASE}/forgot-password`)
    .send({ email: `nobody${DOMAIN}` });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(mockSendEmail).not.toHaveBeenCalled();
});

// ─── 9. Protected route with valid accessToken ────────────────────────────────

it('9. Protected route with valid accessToken → 200', async () => {
  const res = await request(app)
    .get('/api/orders')
    .set('Authorization', `Bearer ${accessToken}`);

  expect(res.status).toBe(200);
});

// ─── 10. Protected route with no token ───────────────────────────────────────

it('10. Protected route with no token → 401', async () => {
  const res = await request(app).get('/api/orders');
  expect(res.status).toBe(401);
  expect(res.body.success).toBe(false);
});

// ─── 11. Expired accessToken ──────────────────────────────────────────────────

it('11. Expired accessToken → 401 with clear message', async () => {
  // Sign a token whose exp is in the past (1 hour ago) to avoid any sleep
  const expiredToken = jwt.sign(
    {
      id: new mongoose.Types.ObjectId().toString(),
      role: 'user',
      exp: Math.floor(Date.now() / 1000) - 3600,
    },
    process.env.JWT_SECRET!
  );

  const res = await request(app)
    .get('/api/orders')
    .set('Authorization', `Bearer ${expiredToken}`);

  expect(res.status).toBe(401);
  expect(res.body.message).toBe('Access token expired. Please refresh.');
});

// ─── 12. Refresh token success ────────────────────────────────────────────────

it('12. Refresh token success → 200 + new accessToken', async () => {
  const res = await request(app)
    .post(`${BASE}/refresh-token`)
    .send({ refreshToken });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.accessToken).toBeDefined();

  // Use the new accessToken for subsequent tests
  accessToken = res.body.data.accessToken;
});

// ─── 15. Logout (must run before test 13 to set up the "after logout" state) ──

it('15. Logout success → 200', async () => {
  const res = await request(app)
    .post(`${BASE}/logout`)
    .set('Authorization', `Bearer ${accessToken}`);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe('Logged out successfully');
});

// ─── 13. Refresh token after logout ──────────────────────────────────────────

it('13. Refresh token after logout → 401 (token cleared in DB)', async () => {
  const res = await request(app)
    .post(`${BASE}/refresh-token`)
    .send({ refreshToken }); // same refreshToken from test 4, now cleared in DB

  expect(res.status).toBe(401);
  expect(res.body.success).toBe(false);
});

// ─── 14. Refresh with invalid token ──────────────────────────────────────────

it('14. Refresh with invalid token → 401', async () => {
  const res = await request(app)
    .post(`${BASE}/refresh-token`)
    .send({ refreshToken: 'this.is.not.a.valid.jwt' });

  expect(res.status).toBe(401);
  expect(res.body.success).toBe(false);
});

// ─── 16. Reset password success ───────────────────────────────────────────────

it('16. Reset password success → 200', async () => {
  // Re-login after logout so the user is in a clean state
  await request(app).post(`${BASE}/login`).send({ email, password });

  // Capture the reset token via the email mock
  let capturedResetToken: string | undefined;
  mockSendEmail.mockImplementation(async (_to: string, token: string) => {
    capturedResetToken = token;
  });

  await request(app).post(`${BASE}/forgot-password`).send({ email });

  expect(capturedResetToken).toBeDefined();

  const res = await request(app)
    .post(`${BASE}/reset-password`)
    .send({ token: capturedResetToken, newPassword: 'NewPassword456' });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe('Password reset successful');
});

// ─── 17. Reset password with invalid token ────────────────────────────────────

it('17. Reset password invalid token → 400', async () => {
  const res = await request(app)
    .post(`${BASE}/reset-password`)
    .send({ token: 'completely-invalid-reset-token', newPassword: 'AnotherPass789' });

  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
});
