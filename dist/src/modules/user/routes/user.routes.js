"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const user_controller_1 = require("../controller/user.controller");
const catchAsync_1 = require("../../../utils/catchAsync");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { success: false, message: 'Too many attempts, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const forgotPasswordLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { success: false, message: 'Too many password reset attempts, please try again after 1 hour.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const router = (0, express_1.Router)();
// Public auth endpoints share one router so the frontend can mount them under /api/auth.
router.post('/register', authLimiter, (0, catchAsync_1.catchAsync)(user_controller_1.register));
router.post('/login', authLimiter, (0, catchAsync_1.catchAsync)(user_controller_1.login));
router.post('/forgot-password', forgotPasswordLimiter, (0, catchAsync_1.catchAsync)(user_controller_1.forgotPasswordHandler));
router.post('/reset-password', (0, catchAsync_1.catchAsync)(user_controller_1.resetPasswordHandler));
router.post('/refresh-token', (0, catchAsync_1.catchAsync)(user_controller_1.refreshTokenHandler));
router.post('/logout', auth_middleware_1.protect, (0, catchAsync_1.catchAsync)(user_controller_1.logoutHandler));
router.get('/google', passport_1.default.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', (req, res, next) => {
    // On success, we redirect back into the SPA with fresh tokens in the query string.
    passport_1.default.authenticate('google', { session: false }, (err, user) => {
        if (err || !user) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
        }
        const { accessToken, refreshToken } = user;
        return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    })(req, res, next);
});
exports.default = router;
// ─── User Management Router (/api/users) ─────────────────────────────────────
exports.usersRouter = (0, express_1.Router)();
// Admin-only user management is split out so role checks stay obvious at the route level.
exports.usersRouter.get('/', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('super_admin', 'user_admin'), (0, catchAsync_1.catchAsync)(user_controller_1.getAllUsersHandler));
exports.usersRouter.get('/:id', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('super_admin', 'user_admin'), (0, catchAsync_1.catchAsync)(user_controller_1.getUserByIdHandler));
exports.usersRouter.patch('/:id/status', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('super_admin', 'user_admin'), (0, catchAsync_1.catchAsync)(user_controller_1.updateUserStatusHandler));
exports.usersRouter.delete('/:id', auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)('super_admin'), (0, catchAsync_1.catchAsync)(user_controller_1.deleteUserHandler));
