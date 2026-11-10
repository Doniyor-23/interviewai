import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import progressRoutes from './routes/progressRoutes.js';

const app = express();
if (env.isProd) app.set('trust proxy', 1);

const allowedOrigins = [
  ...env.clientUrl.split(',').map((u) => u.trim().replace(/\/$/, '')),
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, '');
      const isAllowed =
        allowedOrigins.includes(cleanOrigin) ||
        (cleanOrigin.endsWith('.netlify.app') && env.clientUrl.includes('netlify.app'));
      callback(null, isAllowed);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '600kb' })); // profile images are sent as small data URLs
app.use(cookieParser());
app.use('/api', generalLimiter);

app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/progress', progressRoutes);

app.use(notFound);
app.use(errorHandler);
export default app;
