"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserHandler = exports.updateUserStatusHandler = exports.getUserByIdHandler = exports.getAllUsersHandler = exports.logoutHandler = exports.refreshTokenHandler = exports.resetPasswordHandler = exports.forgotPasswordHandler = exports.login = exports.register = void 0;
const joi_1 = __importDefault(require("joi"));
const user_service_1 = require("../service/user.service");
// ─── Validation Schemas ───────────────────────────────────────────────────────
const registerSchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(2).max(50).required(),
    email: joi_1.default.string().email({ tlds: { allow: false } }).lowercase().required(),
    password: joi_1.default.string().min(8).required(),
}).required();
// Each handler validates its own payload first so the service layer only sees clean input.
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().email({ tlds: { allow: false } }).lowercase().required(),
    password: joi_1.default.string().required(),
}).required();
const forgotPasswordSchema = joi_1.default.object({
    email: joi_1.default.string().email({ tlds: { allow: false } }).lowercase().required(),
}).required();
const resetPasswordSchema = joi_1.default.object({
    token: joi_1.default.string().required(),
    newPassword: joi_1.default.string().min(8).required(),
}).required();
const refreshTokenSchema = joi_1.default.object({
    refreshToken: joi_1.default.string().required(),
}).required();
// ─── Handlers ────────────────────────────────────────────────────────────────
const register = async (req, res) => {
    // Early validation keeps bad input out of the database and makes errors predictable.
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const result = await (0, user_service_1.registerUser)(value.name, value.email, value.password);
    res.status(201).json({ success: true, data: result });
};
exports.register = register;
const login = async (req, res) => {
    // Login follows the same validation flow, then delegates the credential check to the service.
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const result = await (0, user_service_1.loginUser)(value.email, value.password);
    res.status(200).json({ success: true, data: result });
};
exports.login = login;
const forgotPasswordHandler = async (req, res) => {
    // Return a generic response so the API does not reveal whether an email exists.
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    await (0, user_service_1.forgotPassword)(value.email);
    res.status(200).json({
        success: true,
        message: 'If that email exists, a reset link has been sent',
    });
};
exports.forgotPasswordHandler = forgotPasswordHandler;
const resetPasswordHandler = async (req, res) => {
    // The reset token is validated before the service hashes and stores the new password.
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    await (0, user_service_1.resetPassword)(value.token, value.newPassword);
    res.status(200).json({ success: true, message: 'Password reset successful' });
};
exports.resetPasswordHandler = resetPasswordHandler;
const refreshTokenHandler = async (req, res) => {
    // The refresh endpoint rotates the session without forcing a full re-login.
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const result = await (0, user_service_1.refreshAccessToken)(value.refreshToken);
    res.status(200).json({ success: true, data: result });
};
exports.refreshTokenHandler = refreshTokenHandler;
const logoutHandler = async (req, res) => {
    // Clearing the stored refresh token makes the current session unusable going forward.
    await (0, user_service_1.logoutUser)(req.user.id);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};
exports.logoutHandler = logoutHandler;
// ─── User Management Schemas ──────────────────────────────────────────────────
const getAllUsersQuerySchema = joi_1.default.object({
    role: joi_1.default.string().valid('user', 'super_admin', 'product_admin', 'order_admin', 'delivery_admin', 'user_admin'),
    isActive: joi_1.default.boolean(),
    isDeleted: joi_1.default.boolean(),
    search: joi_1.default.string().max(100),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
}).options({ convert: true });
const userIdParamsSchema = joi_1.default.object({
    id: joi_1.default.string().required(),
}).required();
const updateStatusSchema = joi_1.default.object({
    isActive: joi_1.default.boolean().required(),
}).required();
// ─── User Management Handlers ─────────────────────────────────────────────────
const getAllUsersHandler = async (req, res) => {
    // Admin filters are validated before the service constructs the Mongo query.
    const { error, value } = getAllUsersQuerySchema.validate(req.query);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const result = await (0, user_service_1.getAllUsers)(value);
    res.status(200).json({ success: true, data: result });
};
exports.getAllUsersHandler = getAllUsersHandler;
const getUserByIdHandler = async (req, res) => {
    // A valid user ID still needs to exist in the database before we return it.
    const { error, value } = userIdParamsSchema.validate(req.params);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const user = await (0, user_service_1.getUserById)(value.id);
    res.status(200).json({ success: true, data: { user } });
};
exports.getUserByIdHandler = getUserByIdHandler;
const updateUserStatusHandler = async (req, res) => {
    // Only the active flag is exposed here so admin changes stay intentionally narrow.
    const { error: paramsError, value: params } = userIdParamsSchema.validate(req.params);
    if (paramsError) {
        res.status(400).json({ success: false, message: paramsError.details[0].message });
        return;
    }
    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    const user = await (0, user_service_1.updateUserStatus)(params.id, value.isActive);
    res.status(200).json({ success: true, data: { user } });
};
exports.updateUserStatusHandler = updateUserStatusHandler;
const deleteUserHandler = async (req, res) => {
    // Soft deletion preserves history while removing the user from normal app flows.
    const { error, value } = userIdParamsSchema.validate(req.params);
    if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
    }
    await (0, user_service_1.softDeleteUser)(value.id);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
};
exports.deleteUserHandler = deleteUserHandler;
