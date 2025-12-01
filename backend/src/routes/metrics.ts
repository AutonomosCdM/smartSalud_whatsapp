/**
 * Metrics API Routes
 *
 * RESTful endpoints for dashboard metrics
 * - GET /kpis - Key performance indicators
 * - GET /trends - Daily trends (14 days default)
 * - GET /distribution - Status distribution
 * - GET /reminders - Reminder statistics
 *
 * All endpoints support optional date range filtering
 * 5-minute caching via MetricsService
 */

import { Router, Request, Response } from 'express';
import { MetricsService } from '../services/MetricsService';
import { MetricsRepository } from '../repositories/MetricsRepository';
import { MetricsCalculator } from '../utils/MetricsCalculator';
import { CacheService } from '../services/CacheService';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';

// Initialize dependencies (singleton pattern for production)
let metricsService: MetricsService;

export function createMetricsRouter(service?: MetricsService): Router {
  const router = Router();

  // Use injected service (for tests) or create default
  if (!metricsService && !service) {
    const prisma = new PrismaClient();
    const repository = new MetricsRepository(prisma);
    const calculator = new MetricsCalculator();
    const cache = new CacheService();
    metricsService = new MetricsService(repository, calculator, cache);
  }

  const activeService = service || metricsService;

  // Rate limiting: 100 requests per minute per IP
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many requests, please try again later.',
      });
    },
  });

  // Apply rate limiting to all metrics routes
  router.use(limiter);

  /**
   * Parse optional date range from query params
   */
  function parseDateRange(req: Request): { startDate: Date; endDate: Date } | undefined {
    const { startDate, endDate } = req.query;

    if (!startDate && !endDate) {
      return undefined;
    }

    // Validate date format
    if (startDate && isNaN(Date.parse(startDate as string))) {
      throw new Error('Invalid startDate format');
    }

    if (endDate && isNaN(Date.parse(endDate as string))) {
      throw new Error('Invalid endDate format');
    }

    return {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    };
  }

  /**
   * GET /api/metrics/kpis
   * Returns key performance indicators
   *
   * Query params:
   * - startDate (optional): ISO date string
   * - endDate (optional): ISO date string
   */
  router.get('/kpis', async (req: Request, res: Response) => {
    try {
      const dateRange = parseDateRange(req);
      const kpis = await activeService.getKPIs(dateRange);

      return res.status(200).json(kpis);
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return res.status(400).json({
          error: error.message,
        });
      }

      // Log error in development
      if (process.env.NODE_ENV === 'development') {
        console.error('GET /api/metrics/kpis error:', error);
        return res.status(500).json({
          error: error.message,
        });
      }

      // Hide internal errors in production
      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  /**
   * GET /api/metrics/trends
   * Returns daily trends for last N days
   *
   * Query params:
   * - days (optional): Number of days (default: 14)
   */
  router.get('/trends', async (req: Request, res: Response) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 14;

      // Validate days parameter
      if (isNaN(days) || days <= 0 || days > 365) {
        return res.status(400).json({
          error: 'Invalid days parameter - must be between 1 and 365',
        });
      }

      const trends = await activeService.getTrends({ days });

      return res.status(200).json(trends);
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('GET /api/metrics/trends error:', error);
        return res.status(500).json({
          error: error.message,
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  /**
   * GET /api/metrics/distribution
   * Returns appointment status distribution
   *
   * Query params:
   * - startDate (optional): ISO date string
   * - endDate (optional): ISO date string
   */
  router.get('/distribution', async (req: Request, res: Response) => {
    try {
      const dateRange = parseDateRange(req);
      const distribution = await activeService.getDistribution(dateRange);

      return res.status(200).json(distribution);
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return res.status(400).json({
          error: error.message,
        });
      }

      if (process.env.NODE_ENV === 'development') {
        console.error('GET /api/metrics/distribution error:', error);
        return res.status(500).json({
          error: error.message,
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  /**
   * GET /api/metrics/reminders
   * Returns reminder statistics
   *
   * Query params:
   * - startDate (optional): ISO date string
   * - endDate (optional): ISO date string
   */
  router.get('/reminders', async (req: Request, res: Response) => {
    try {
      const dateRange = parseDateRange(req);
      const stats = await activeService.getRemindersStats(dateRange);

      return res.status(200).json(stats);
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return res.status(400).json({
          error: error.message,
        });
      }

      if (process.env.NODE_ENV === 'development') {
        console.error('GET /api/metrics/reminders error:', error);
        return res.status(500).json({
          error: error.message,
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  return router;
}

// Default export for production use
export const metricsRouter = createMetricsRouter();
