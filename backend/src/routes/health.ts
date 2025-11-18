import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const router = Router();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

router.get('/', async (_req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    const dbStatus = 'connected';

    // Check Redis
    let redisStatus = 'disconnected';
    try {
      if (redis.status === 'ready' || redis.status === 'connecting') {
        await redis.ping();
        redisStatus = 'connected';
      } else {
        await redis.connect();
        await redis.ping();
        redisStatus = 'connected';
      }
    } catch (redisError) {
      console.error('Redis health check failed:', redisError);
      redisStatus = 'disconnected';
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
