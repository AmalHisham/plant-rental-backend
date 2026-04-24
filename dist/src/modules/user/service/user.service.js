"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOrCreateGoogleUser = exports.softDeleteUser = exports.updateUserStatus = exports.getUserById = exports.getAllUsers = exports.findUserById = exports.logoutUser = exports.refreshAccessToken = exports.resetPassword = exports.validateResetToken = exports.forgotPassword = exports.loginUser = exports.registerUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const user_model_1 = require("../models/user.model");
const email_service_1 = require("./email.service");
const AppError_1 = require("../../../utils/AppError");
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '15d';
const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 hour
const signAccessToken = (userId, role) => {
    const secret = process.env.JWT_SECRET;
    return jsonwebtoken_1.default.sign({ id: userId, role }, secret, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};
const signRefreshToken = (userId) => {
    const secret = process.env.JWT_REFRESH_SECRET;
    return jsonwebtoken_1.default.sign({ id: userId }, secret, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};
// ─── Register ────────────────────────────────────────────────────────────────
const registerUser = async (name, email, password) => {
    // Check for duplicate accounts before doing any expensive hashing work.
    const existing = await user_model_1.User.findOne({ email });
    if (existing)
        throw new AppError_1.AppError('Email already in use', 409);
    const hashed = await bcryptjs_1.default.hash(password, 12);
    const user = await user_model_1.User.create({ name, email, password: hashed });
    // Issue both tokens immediately so the client can stay signed in after sign-up.
    const accessToken = signAccessToken(String(user._id), user.role);
    const refreshToken = signRefreshToken(String(user._id));
    user.refreshToken = refreshToken;
    await user.save();
    return {
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
    };
};
exports.registerUser = registerUser;
// ─── Login ───────────────────────────────────────────────────────────────────
const loginUser = async (email, password) => {
    // Password is selected explicitly because it is hidden from normal queries.
    const user = await user_model_1.User.findOne({ email, isDeleted: false }).select('+password');
    if (!user || !user.password)
        throw new AppError_1.AppError('Invalid email or password', 401);
    if (!user.isActive)
        throw new AppError_1.AppError('Account is deactivated', 401);
    const match = await bcryptjs_1.default.compare(password, user.password);
    if (!match)
        throw new AppError_1.AppError('Invalid email or password', 401);
    const accessToken = signAccessToken(String(user._id), user.role);
    const refreshToken = signRefreshToken(String(user._id));
    // Only the latest refresh token remains valid.
    user.refreshToken = refreshToken;
    await user.save();
    return {
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
    };
};
exports.loginUser = loginUser;
// ─── Forgot Password ─────────────────────────────────────────────────────────
const forgotPassword = async (email) => {
    // Return silently for unknown emails to avoid user enumeration.
    const user = await user_model_1.User.findOne({ email });
    // Always resolve to avoid user enumeration
    if (!user)
        return;
    const rawToken = crypto_1.default.randomBytes(32).toString('hex');
    const hashed = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
    // Store only the digest; the raw token is sent in the reset email.
    user.passwordResetToken = hashed;
    user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);
    await user.save();
    await (0, email_service_1.sendPasswordResetEmail)(email, rawToken);
};
exports.forgotPassword = forgotPassword;
// ─── Validate Reset Token ────────────────────────────────────────────────────
const validateResetToken = async (token) => {
    // Hash the supplied token before comparing it with the stored digest.
    const hashed = crypto_1.default.createHash('sha256').update(token).digest('hex');
    const user = await user_model_1.User.findOne({
        passwordResetToken: hashed,
        passwordResetExpires: { $gt: new Date() },
    });
    if (!user)
        throw new AppError_1.AppError('Token is invalid or has expired', 400);
    return user;
};
exports.validateResetToken = validateResetToken;
// ─── Reset Password ──────────────────────────────────────────────────────────
const resetPassword = async (token, newPassword) => {
    const user = await (0, exports.validateResetToken)(token);
    // Rehash the new password with the same cost factor used elsewhere in the app.
    const hashed = await bcryptjs_1.default.hash(newPassword, 12);
    await user_model_1.User.findByIdAndUpdate(user._id, {
        $set: { password: hashed },
        $unset: { passwordResetToken: '', passwordResetExpires: '' },
    }, { returnDocument: 'after' });
};
exports.resetPassword = resetPassword;
// ─── Refresh Access Token ─────────────────────────────────────────────────────
const refreshAccessToken = async (token) => {
    let decoded;
    try {
        // Refresh tokens are verified with the refresh secret, not the access-token secret.
        decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET);
    }
    catch {
        throw new AppError_1.AppError('Invalid or expired refresh token', 401);
    }
    const user = await user_model_1.User.findOne({ _id: decoded.id, isDeleted: false });
    if (!user || !user.isActive)
        throw new AppError_1.AppError('User no longer exists or is inactive', 401);
    // Make sure the client is presenting the exact refresh token the server last issued.
    if (user.refreshToken !== token)
        throw new AppError_1.AppError('Refresh token mismatch. Please log in again', 401);
    const accessToken = signAccessToken(String(user._id), user.role);
    return { accessToken };
};
exports.refreshAccessToken = refreshAccessToken;
// ─── Logout ───────────────────────────────────────────────────────────────────
const logoutUser = async (userId) => {
    // Remove the refresh token so the session cannot be renewed.
    await user_model_1.User.findByIdAndUpdate(userId, { refreshToken: null });
};
exports.logoutUser = logoutUser;
// ─── Find by ID (used by auth middleware) ────────────────────────────────────
const findUserById = async (id) => {
    return user_model_1.User.findOne({ _id: id, isDeleted: false }).select('-password -passwordResetToken -passwordResetExpires');
};
exports.findUserById = findUserById;
// ─── Get All Users ────────────────────────────────────────────────────────────
const getAllUsers = async (filters) => {
    // Merge the optional filters into a single Mongo query, then paginate the response.
    const { role, isActive, isDeleted = false, search, page = 1, limit = 10 } = filters;
    const query = { isDeleted };
    if (role)
        query.role = role;
    if (isActive !== undefined)
        query.isActive = isActive;
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
    }
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
        user_model_1.User.find(query)
            .select('-password -passwordResetToken -passwordResetExpires -refreshToken')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }),
        user_model_1.User.countDocuments(query),
    ]);
    return { users, total, page, totalPages: Math.ceil(total / limit) };
};
exports.getAllUsers = getAllUsers;
// ─── Get User By ID ───────────────────────────────────────────────────────────
const getUserById = async (id) => {
    // Sensitive auth fields stay hidden in this lookup.
    const user = await user_model_1.User.findOne({ _id: id, isDeleted: false }).select('-password -passwordResetToken -passwordResetExpires -refreshToken');
    if (!user)
        throw new AppError_1.AppError('User not found', 404);
    return user;
};
exports.getUserById = getUserById;
// ─── Update User Status ───────────────────────────────────────────────────────
const updateUserStatus = async (id, isActive) => {
    // Return the updated document so the admin UI can refresh immediately.
    const user = await user_model_1.User.findOneAndUpdate({ _id: id, isDeleted: false }, { isActive }, { returnDocument: 'after' }).select('-password -passwordResetToken -passwordResetExpires -refreshToken');
    if (!user)
        throw new AppError_1.AppError('User not found', 404);
    return user;
};
exports.updateUserStatus = updateUserStatus;
// ─── Soft Delete User ─────────────────────────────────────────────────────────
const softDeleteUser = async (id) => {
    // Soft delete plus refresh-token revocation keeps the audit trail while closing access.
    const user = await user_model_1.User.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true, refreshToken: null });
    if (!user)
        throw new AppError_1.AppError('User not found', 404);
};
exports.softDeleteUser = softDeleteUser;
// ─── Find or Create Google User ───────────────────────────────────────────────
const findOrCreateGoogleUser = async (googleId, email, name) => {
    // Reuse an existing Google-linked user first, then fall back to matching by email.
    let user = await user_model_1.User.findOne({ googleId, isDeleted: false });
    if (!user) {
        user = await user_model_1.User.findOne({ email, isDeleted: false });
        if (user) {
            user.googleId = googleId;
            await user.save();
        }
    }
    if (!user) {
        user = await user_model_1.User.create({ name, email, googleId });
    }
    if (!user.isActive)
        throw new AppError_1.AppError('Account is deactivated', 401);
    // Google sign-in returns the same auth bundle as the email/password flow.
    const accessToken = signAccessToken(String(user._id), user.role);
    const refreshToken = signRefreshToken(String(user._id));
    user.refreshToken = refreshToken;
    await user.save();
    return {
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
    };
};
exports.findOrCreateGoogleUser = findOrCreateGoogleUser;
