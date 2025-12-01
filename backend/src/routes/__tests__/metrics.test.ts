/**
 * Metrics API Routes Tests
 *
 * RED PHASE: These tests MUST fail - implementation pending
 *
 * Coverage:
 * - GET /api/metrics/kpis - Key performance indicators
 * - GET /api/metrics/trends - 14-day trends
 * - GET /api/metrics/distribution - Status distribution
 * - GET /api/metrics/reminders - Reminder stats
 * - Error handling (500, 400, etc.)
 * - Rate limiting
 * - Query parameters validation
 *
 * Tests for Metrics Routes
 *
 * This test suite verifies the behavior of the metrics endpoints.
 */

import request from 'supertest';
import express, { Express } from 'express';
import { createMetricsRouter } from '../metrics';
import { MetricsService } from '../../services/MetricsService';

describe('Metrics API Routes', () => {
  let app: Express;
  let mockMetricsService: jest.Mocked<MetricsService>;

  // Mock data
  const mockKPIs = {
    noShowRate: 12.0,
    confirmationRate: 75.0,
    cancellationRate: 8.0,
    rescheduleRate: 5.0,
    totalAppointments: 100,
    trend: {
      change: 5.2,
      direction: 'up' as const,
    },
  };

  const mockTrends = [
    { date: '2025-11-04', total: 8, confirmed: 6, noShows: 1, noShowRate: 12.5 },
    { date: '2025-11-05', total: 12, confirmed: 10, noShows: 1, noShowRate: 8.3 },
    { date: '2025-11-06', total: 10, confirmed: 8, noShows: 2, noShowRate: 20.0 },
    // ... more days
  ];

  const mockDistribution = [
    { status: 'CONFIRMADO', count: 75, percentage: 75.0 },
    { status: 'NO_SHOW', count: 12, percentage: 12.0 },
    { status: 'CANCELADO', count: 8, percentage: 8.0 },
    { status: 'REAGENDADO', count: 5, percentage: 5.0 },
  ];

  const mockRemindersStats = {
    totalSent: 245,
    responseRate: 68.5,
    averagePerAppointment: 2.45,
    byChannel: [
      { channel: 'whatsapp', sent: 200, responded: 145, responseRate: 72.5 },
      { channel: 'sms', sent: 45, responded: 23, responseRate: 51.1 },
    ],
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock service
    mockMetricsService = {
      getKPIs: jest.fn(),
      getTrends: jest.fn(),
      getDistribution: jest.fn(),
      getRemindersStats: jest.fn(),
    } as any;

    // Setup Express app with injected mock
    app = express();
    app.use(express.json());
    app.use('/api/metrics', createMetricsRouter(mockMetricsService));
  });

  describe('GET /api/metrics/kpis', () => {
    it('should return 200 with KPIs', async () => {
      // Arrange
      mockMetricsService.getKPIs = jest.fn().mockResolvedValue(mockKPIs);

      // Act
      const response = await request(app).get('/api/metrics/kpis');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockKPIs);
    });

    it('should return KPIs with correct structure', async () => {
      // Arrange
      mockMetricsService.getKPIs = jest.fn().mockResolvedValue(mockKPIs);

      // Act
      const response = await request(app).get('/api/metrics/kpis');

      // Assert
      expect(response.body).toHaveProperty('noShowRate');
      expect(response.body).toHaveProperty('confirmationRate');
      expect(response.body).toHaveProperty('totalAppointments');
      expect(response.body).toHaveProperty('trend');
    });

    it('should accept date range query parameters', async () => {
      // Arrange
      mockMetricsService.getKPIs = jest.fn().mockResolvedValue(mockKPIs);

      // Act
      const response = await request(app)
        .get('/api/metrics/kpis')
        .query({
          startDate: '2025-11-01',
          endDate: '2025-11-17',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(mockMetricsService.getKPIs).toHaveBeenCalledWith({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
    });

    it('should return 400 for invalid date format', async () => {
      // Act
      const response = await request(app)
        .get('/api/metrics/kpis')
        .query({
          startDate: 'invalid-date',
          endDate: '2025-11-17',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 when service throws error', async () => {
      // Arrange
      mockMetricsService.getKPIs = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app).get('/api/metrics/kpis');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should set correct Content-Type header', async () => {
      // Arrange
      mockMetricsService.getKPIs = jest.fn().mockResolvedValue(mockKPIs);

      // Act
      const response = await request(app).get('/api/metrics/kpis');

      // Assert
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should enforce rate limiting', async () => {
      // Arrange
      mockMetricsService.getKPIs = jest.fn().mockResolvedValue(mockKPIs);

      // Act - Make 100+ requests rapidly
      const requests = Array(101)
        .fill(null)
        .map(() => request(app).get('/api/metrics/kpis'));
      const responses = await Promise.all(requests);

      // Assert
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/metrics/trends', () => {
    it('should return 200 with trends data', async () => {
      // Arrange
      mockMetricsService.getTrends = jest.fn().mockResolvedValue(mockTrends);

      // Act
      const response = await request(app).get('/api/metrics/trends');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTrends);
    });

    it('should return array of daily trends', async () => {
      // Arrange
      mockMetricsService.getTrends = jest.fn().mockResolvedValue(mockTrends);

      // Act
      const response = await request(app).get('/api/metrics/trends');

      // Assert
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('date');
      expect(response.body[0]).toHaveProperty('total');
      expect(response.body[0]).toHaveProperty('noShowRate');
    });

    it('should accept days query parameter', async () => {
      // Arrange
      mockMetricsService.getTrends = jest.fn().mockResolvedValue(mockTrends);

      // Act
      const response = await request(app).get('/api/metrics/trends').query({ days: 7 });

      // Assert
      expect(response.status).toBe(200);
      expect(mockMetricsService.getTrends).toHaveBeenCalledWith({ days: 7 });
    });

    it('should default to 14 days if not specified', async () => {
      // Arrange
      mockMetricsService.getTrends = jest.fn().mockResolvedValue(mockTrends);

      // Act
      const response = await request(app).get('/api/metrics/trends');

      // Assert
      expect(response.status).toBe(200);
      expect(mockMetricsService.getTrends).toHaveBeenCalledWith({ days: 14 });
    });

    it('should return 400 for invalid days parameter', async () => {
      // Act
      const response = await request(app).get('/api/metrics/trends').query({ days: -5 });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 500 when service throws error', async () => {
      // Arrange
      mockMetricsService.getTrends = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app).get('/api/metrics/trends');

      // Assert
      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/metrics/distribution', () => {
    it('should return 200 with distribution data', async () => {
      // Arrange
      mockMetricsService.getDistribution = jest.fn().mockResolvedValue(mockDistribution);

      // Act
      const response = await request(app).get('/api/metrics/distribution');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockDistribution);
    });

    it('should return array of status counts', async () => {
      // Arrange
      mockMetricsService.getDistribution = jest.fn().mockResolvedValue(mockDistribution);

      // Act
      const response = await request(app).get('/api/metrics/distribution');

      // Assert
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('count');
      expect(response.body[0]).toHaveProperty('percentage');
    });

    it('should accept date range query parameters', async () => {
      // Arrange
      mockMetricsService.getDistribution = jest.fn().mockResolvedValue(mockDistribution);

      // Act
      const response = await request(app)
        .get('/api/metrics/distribution')
        .query({
          startDate: '2025-11-01',
          endDate: '2025-11-17',
        });

      // Assert
      expect(response.status).toBe(200);
    });

    it('should return 500 when service throws error', async () => {
      // Arrange
      mockMetricsService.getDistribution = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app).get('/api/metrics/distribution');

      // Assert
      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/metrics/reminders', () => {
    it('should return 200 with reminders stats', async () => {
      // Arrange
      mockMetricsService.getRemindersStats = jest
        .fn()
        .mockResolvedValue(mockRemindersStats);

      // Act
      const response = await request(app).get('/api/metrics/reminders');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRemindersStats);
    });

    it('should return stats with correct structure', async () => {
      // Arrange
      mockMetricsService.getRemindersStats = jest
        .fn()
        .mockResolvedValue(mockRemindersStats);

      // Act
      const response = await request(app).get('/api/metrics/reminders');

      // Assert
      expect(response.body).toHaveProperty('totalSent');
      expect(response.body).toHaveProperty('responseRate');
      expect(response.body).toHaveProperty('averagePerAppointment');
      expect(response.body).toHaveProperty('byChannel');
    });

    it('should return channel breakdown', async () => {
      // Arrange
      mockMetricsService.getRemindersStats = jest
        .fn()
        .mockResolvedValue(mockRemindersStats);

      // Act
      const response = await request(app).get('/api/metrics/reminders');

      // Assert
      expect(Array.isArray(response.body.byChannel)).toBe(true);
      expect(response.body.byChannel[0]).toHaveProperty('channel');
      expect(response.body.byChannel[0]).toHaveProperty('sent');
      expect(response.body.byChannel[0]).toHaveProperty('responded');
    });

    it('should return 500 when service throws error', async () => {
      // Arrange
      mockMetricsService.getRemindersStats = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app).get('/api/metrics/reminders');

      // Assert
      expect(response.status).toBe(500);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoint', async () => {
      // Act
      const response = await request(app).get('/api/metrics/invalid');

      // Assert
      expect(response.status).toBe(404);
    });

    it('should return JSON error for 500 errors', async () => {
      // Arrange
      mockMetricsService.getKPIs = jest.fn().mockRejectedValue(new Error('DB error'));

      // Act
      const response = await request(app).get('/api/metrics/kpis');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should not expose internal error details in production', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      mockMetricsService.getKPIs = jest
        .fn()
        .mockRejectedValue(new Error('SELECT * FROM secret_table'));

      // Act
      const response = await request(app).get('/api/metrics/kpis');

      // Assert
      expect(response.body.error).not.toContain('secret_table');
      expect(response.body.error).toBe('Internal server error');
    });

    it('should expose error details in development', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      mockMetricsService.getKPIs = jest
        .fn()
        .mockRejectedValue(new Error('Detailed error message'));

      // Act
      const response = await request(app).get('/api/metrics/kpis');

      // Assert
      expect(response.body.error).toContain('Detailed error message');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow reasonable request rate', async () => {
      // Arrange
      mockMetricsService.getKPIs = jest.fn().mockResolvedValue(mockKPIs);

      // Act - 10 requests should be fine
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).get('/api/metrics/kpis'));
      const responses = await Promise.all(requests);

      // Assert
      const successResponses = responses.filter(r => r.status === 200);
      expect(successResponses.length).toBe(10);
    });

    it('should return 429 when rate limit exceeded', async () => {
      // Arrange
      mockMetricsService.getKPIs = jest.fn().mockResolvedValue(mockKPIs);

      // Act - Exceed rate limit (100 requests/min)
      const requests = Array(150)
        .fill(null)
        .map(() => request(app).get('/api/metrics/kpis'));
      const responses = await Promise.all(requests);

      // Assert
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should include rate limit headers', async () => {
      // Arrange
      mockMetricsService.getKPIs = jest.fn().mockResolvedValue(mockKPIs);

      // Act
      const response = await request(app).get('/api/metrics/kpis');

      // Assert
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    });
  });

  describe.skip('CORS', () => {
    // CORS middleware will be added at the main server.ts level
    it('should include CORS headers', async () => {
      // Arrange
      mockMetricsService.getKPIs = jest.fn().mockResolvedValue(mockKPIs);

      // Act
      const response = await request(app)
        .get('/api/metrics/kpis')
        .set('Origin', 'http://localhost:3000');

      // Assert
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle OPTIONS preflight request', async () => {
      // Act
      const response = await request(app)
        .options('/api/metrics/kpis')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });
  });
});
