import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    console.log(`[CORS] Request from: ${origin}`);

    // Allow requests with no origin (mobile apps, curl, Twilio webhooks)
    if (!origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.ngrok-free.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
import healthRouter from './routes/health';
import appointmentsRouter from './routes/appointments';
import whatsappWebhookRouter from './routes/webhooks/whatsapp';
import { createMetricsRouter } from './routes/metrics';

app.use('/api/health', healthRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/webhooks/whatsapp', whatsappWebhookRouter);
app.use('/api/metrics', createMetricsRouter());

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
import errorHandler from './middleware/errorHandler';
app.use(errorHandler);

export default app;
