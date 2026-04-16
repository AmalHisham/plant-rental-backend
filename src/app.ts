import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import userRoutes, { usersRouter } from './modules/user/routes/user.routes';
import plantRoutes from './modules/plant/routes/plant.routes';
import orderRoutes from './modules/order/routes/order.routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.status(200).json({ success: true, message: 'Plant Rental Platform API' });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

app.use('/api/auth', userRoutes);
app.use('/api/users', usersRouter);
app.use('/api/plants', plantRoutes);
app.use('/api/orders', orderRoutes);

app.use(errorHandler);

export default app;
