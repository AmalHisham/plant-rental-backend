"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const passport_1 = __importDefault(require("passport"));
// Side-effect import — registers the Google OAuth strategy on the passport instance
// Must be imported before any route that uses passport.authenticate('google')
require("./config/passport");
// Route imports — each module handles its own set of API endpoints
const user_routes_1 = __importStar(require("./modules/user/routes/user.routes"));
const plant_routes_1 = __importDefault(require("./modules/plant/routes/plant.routes"));
const order_routes_1 = __importDefault(require("./modules/order/routes/order.routes"));
const wishlist_routes_1 = __importDefault(require("./modules/wishlist/routes/wishlist.routes"));
const cart_routes_1 = __importDefault(require("./modules/cart/routes/cart.routes"));
const payment_routes_1 = __importDefault(require("./modules/payment/routes/payment.routes"));
const admin_routes_1 = __importDefault(require("./modules/admin/routes/admin.routes"));
// Global error handler — must be registered LAST after all routes
const error_middleware_1 = require("./middlewares/error.middleware");
const app = (0, express_1.default)();
// helmet() sets secure HTTP response headers automatically
// Protects against XSS, clickjacking, MIME sniffing, and other common attacks
app.use((0, helmet_1.default)());
// CORS — allows the frontend origin to make API requests to this backend
// credentials: true is required to allow cookies/auth headers cross-origin
// Without this, the browser would block all frontend API calls
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
// Parse incoming JSON request bodies — populates req.body
// Without this, req.body would be undefined for POST/PUT requests
app.use(express_1.default.json());
// Initialize Passport — required before any passport.authenticate() middleware
// session: false is used throughout (JWT-based auth, no server-side sessions)
app.use(passport_1.default.initialize());
// Health check routes — useful for uptime monitoring and deployment checks
app.get('/', (_req, res) => {
    res.status(200).json({ success: true, message: 'Plant Rental Platform API' });
});
app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, message: 'Server is running' });
});
// Mount all feature routers at their base paths
// /api/auth  — register, login, Google OAuth, forgot/reset password, refresh, logout
app.use('/api/auth', user_routes_1.default);
// /api/users — admin-only user management (list, get, toggle status, delete)
app.use('/api/users', user_routes_1.usersRouter);
// /api/plants — public read, admin write (CRUD + filters + pagination)
app.use('/api/plants', plant_routes_1.default);
// /api/orders — user creates orders, admins update status/damage/deposit
app.use('/api/orders', order_routes_1.default);
// /api/wishlist — authenticated users save/remove plants from wishlist
app.use('/api/wishlist', wishlist_routes_1.default);
// /api/cart — authenticated users manage their shopping cart
app.use('/api/cart', cart_routes_1.default);
// /api/payment — Razorpay order creation and payment verification
app.use('/api/payment', payment_routes_1.default);
// /api/admin — dashboard stats, all orders view, admin user creation
app.use('/api/admin', admin_routes_1.default);
// Global error handler — MUST be registered after all routes
// Any error passed via next(err) or thrown inside catchAsync lands here
app.use(error_middleware_1.errorHandler);
exports.default = app;
