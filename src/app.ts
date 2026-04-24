// Central Express app — imported by index.ts (server) and by Jest tests (no port binding needed).
// All middleware registration order here is intentional: helmet + cors before routes,
// errorHandler last so it catches errors from every route.

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import passport from 'passport';

// Side-effect import — registers the Google OAuth strategy on the global passport instance.
// Must be imported before any route calls passport.authenticate('google').
import './config/passport';

import userRoutes, { usersRouter } from './modules/user/routes/user.routes';
import plantRoutes from './modules/plant/routes/plant.routes';
import orderRoutes from './modules/order/routes/order.routes';
import wishlistRoutes from './modules/wishlist/routes/wishlist.routes';
import cartRoutes from './modules/cart/routes/cart.routes';
import paymentRoutes from './modules/payment/routes/payment.routes';
import adminRoutes from './modules/admin/routes/admin.routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

// helmet() sets ~15 secure HTTP response headers (CSP, HSTS, X-Frame-Options, etc.)
// in one call — protects against XSS, clickjacking, MIME sniffing, and more.
app.use(helmet());

// credentials: true allows the browser to send cookies/Authorization headers cross-origin.
// Without this flag, the browser blocks requests from the frontend even if origin matches.
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());

// session: false — the app is stateless (JWT-based). Passport is initialized but
// never asked to serialize/deserialize users into a session store.
app.use(passport.initialize());

app.get('/', (_req, res) => {
  res.status(200).json({ success: true, message: 'Plant Rental Platform API' });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// /api/auth  — register, login, Google OAuth, forgot/reset password, refresh, logout
app.use('/api/auth', userRoutes);

// /api/users — RBAC-protected user management (list, get, toggle status, soft delete)
// Separate from /api/auth because auth is public; user management is admin-only.
app.use('/api/users', usersRouter);

app.use('/api/plants', plantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// errorHandler MUST be the last middleware. Express identifies a 4-argument middleware
// as an error handler — any error passed via next(err) or thrown inside catchAsync lands here.
app.use(errorHandler);

export default app;
