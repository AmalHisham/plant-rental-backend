"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = __importDefault(require("../../../app"));
const user_model_1 = require("../models/user.model");
const email_service_1 = require("../service/email.service");
// The auth tests focus on API behavior, so email delivery is stubbed out.
jest.mock('../service/email.service', () => ({
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));
const mockSendEmail = email_service_1.sendPasswordResetEmail;
// Shared state between test cases keeps the flow close to a real user session.
const BASE = '/api/auth';
const DOMAIN = '@auth-test.example';
const email = `user${DOMAIN}`;
const password = 'Password123';
const name = 'Auth Test User';
let accessToken;
let refreshToken;
beforeAll(async () => {
    // Start from a clean collection so uniqueness and token assertions stay stable.
    await mongoose_1.default.connect(process.env.TEST_MONGO_URI);
    await user_model_1.User.deleteMany({ email: { $regex: '@auth-test\\.example$' } });
});
afterAll(async () => {
    await user_model_1.User.deleteMany({ email: { $regex: '@auth-test\\.example$' } });
    await mongoose_1.default.disconnect();
});
beforeEach(() => {
    jest.clearAllMocks();
});
it('1. Register success → 201 + accessToken + refreshToken', async () => {
    // This proves the happy path and captures tokens for later auth tests.
    const res = await (0, supertest_1.default)(app_1.default)
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
it('2. Register duplicate email → 409', async () => {
    // Duplicate registration must fail because email is the unique identity field.
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/register`)
        .send({ name, email, password });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
});
it('3. Register empty body → 400', async () => {
    // Missing fields should be rejected before the service layer runs.
    const res = await (0, supertest_1.default)(app_1.default).post(`${BASE}/register`).send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
});
it('4. Login success → 200 + accessToken + refreshToken', async () => {
    // Logging in should rotate the tokens just like registration does.
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/login`)
        .send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // Refresh the stored session values so later tests use the latest pair.
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
});
it('5. Login wrong password → 401', async () => {
    // Wrong passwords should never reveal whether the email exists.
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/login`)
        .send({ email, password: 'WrongPassword9' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
});
it('6. Login wrong email → 401', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/login`)
        .send({ email: `nobody${DOMAIN}`, password });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
});
it('7. Forgot password existing email → 200 + email sent', async () => {
    // Known emails should trigger exactly one reset email.
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/forgot-password`)
        .send({ email });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
});
it('8. Forgot password non-existing email → 200 (same response, no email)', async () => {
    // Unknown emails get the same response so the endpoint does not leak account existence.
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/forgot-password`)
        .send({ email: `nobody${DOMAIN}` });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockSendEmail).not.toHaveBeenCalled();
});
it('9. Protected route with valid accessToken → 200', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .get('/api/orders')
        .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
});
it('10. Protected route with no token → 401', async () => {
    const res = await (0, supertest_1.default)(app_1.default).get('/api/orders');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
});
it('11. Expired accessToken → 401 with clear message', async () => {
    // A backdated JWT exercises the expiration branch without waiting in real time.
    const expiredToken = jsonwebtoken_1.default.sign({
        id: new mongoose_1.default.Types.ObjectId().toString(),
        role: 'user',
        exp: Math.floor(Date.now() / 1000) - 3600,
    }, process.env.JWT_SECRET);
    const res = await (0, supertest_1.default)(app_1.default)
        .get('/api/orders')
        .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Access token expired. Please refresh.');
});
it('12. Refresh token success → 200 + new accessToken', async () => {
    // Refreshing should issue a new access token without changing the refresh token here.
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/refresh-token`)
        .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    // Use the refreshed access token in later tests.
    accessToken = res.body.data.accessToken;
});
it('15. Logout success → 200', async () => {
    // Logout clears the persisted refresh token so subsequent refresh attempts fail.
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/logout`)
        .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Logged out successfully');
});
it('13. Refresh token after logout → 401 (token cleared in DB)', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/refresh-token`)
        .send({ refreshToken }); // same refreshToken from test 4, now cleared in DB
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
});
it('14. Refresh with invalid token → 401', async () => {
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/refresh-token`)
        .send({ refreshToken: 'this.is.not.a.valid.jwt' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
});
it('16. Reset password success → 200', async () => {
    // Re-login after logout so the reset flow starts from a valid session state.
    await (0, supertest_1.default)(app_1.default).post(`${BASE}/login`).send({ email, password });
    // Capture the reset token from the mocked mailer so we can complete the round trip.
    let capturedResetToken;
    mockSendEmail.mockImplementation(async (_to, token) => {
        capturedResetToken = token;
    });
    await (0, supertest_1.default)(app_1.default).post(`${BASE}/forgot-password`).send({ email });
    expect(capturedResetToken).toBeDefined();
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/reset-password`)
        .send({ token: capturedResetToken, newPassword: 'NewPassword456' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Password reset successful');
});
it('17. Reset password invalid token → 400', async () => {
    // Invalid tokens should fail before any password update happens.
    const res = await (0, supertest_1.default)(app_1.default)
        .post(`${BASE}/reset-password`)
        .send({ token: 'completely-invalid-reset-token', newPassword: 'AnotherPass789' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
});
