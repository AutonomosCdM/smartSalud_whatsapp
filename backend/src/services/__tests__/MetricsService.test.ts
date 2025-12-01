/**
 * MetricsService Tests
 *
 * RED PHASE: These tests MUST fail - implementation pending
 *
 * Coverage:
 * - getKPIs() - Calculate key performance indicators
 * - getTrends() - 14-day trend analysis
 * - getDistribution() - Appointment status distribution
 * - getRemindersStats() - Reminder effectiveness metrics
 * - Caching behavior (5 min TTL)
 * - Error handling
 *
 * Tests for MetricsService
 *
 * This test suite verifies the business logic for metrics calculation.
 */

import { MetricsService } from '../MetricsService';
import { MetricsRepository } from '../../repositories/MetricsRepository';
import { MetricsCalculator } from '../../utils/MetricsCalculator';
import { CacheService } from '../CacheService';

// Mock dependencies
jest.mock('../../repositories/MetricsRepository');
jest.mock('../../utils/MetricsCalculator');
jest.mock('../CacheService');

describe('MetricsService', () => {
  let service: MetricsService;
  let mockRepository: jest.Mocked<MetricsRepository>;
  let mockCalculator: jest.Mocked<MetricsCalculator>;
  let mockCache: jest.Mocked<CacheService>;

  // Realistic Chilean healthcare data fixtures
  const mockAppointmentStats = {
    total: 100,
    confirmed: 75,
    noShows: 12,
    cancelled: 8,
    rescheduled: 5,
    pending: 0,
  };

  const mockDailyTrends = [
    { date: '2025-11-04', total: 8, confirmed: 6, noShows: 1, cancelled: 0, rescheduled: 1 },
    { date: '2025-11-05', total: 12, confirmed: 10, noShows: 1, cancelled: 0, rescheduled: 1 },
    { date: '2025-11-06', total: 10, confirmed: 8, noShows: 2, cancelled: 0, rescheduled: 0 },
    // ... 14 days of data
    { date: '2025-11-17', total: 15, confirmed: 13, noShows: 1, cancelled: 0, rescheduled: 1 },
  ];

  const mockStatusDistribution = [
    { status: 'CONFIRMADO', count: 75 },
    { status: 'NO_SHOW', count: 12 },
    { status: 'CANCELADO', count: 8 },
    { status: 'REAGENDADO', count: 5 },
  ];

  const mockReminderStats = {
    totalSent: 245,
    responseRate: 68.5,
    averagePerAppointment: 2.45,
    byChannel: [
      { channel: 'whatsapp', sent: 200, responded: 145, responseRate: 72.5 },
      { channel: 'sms', sent: 45, responded: 23, responseRate: 51.1 },
    ],
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock instances
    mockRepository = {
      getAppointmentStats: jest.fn(),
      getDailyTrends: jest.fn(),
      getStatusDistribution: jest.fn(),
      getReminderStats: jest.fn(),
    } as any;

    mockCalculator = {
      calculateKPIs: jest.fn(),
    } as any;

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
    } as any;

    // Inject dependencies
    service = new MetricsService(mockRepository, mockCalculator, mockCache);
  });

  describe('getKPIs', () => {
    it('should calculate no-show rate correctly', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null); // Cache miss
      mockRepository.getAppointmentStats.mockResolvedValue(mockAppointmentStats);
      mockCalculator.calculateKPIs.mockReturnValue({
        noShowRate: 12.0,
        confirmationRate: 75.0,
        cancellationRate: 8.0,
        rescheduleRate: 5.0,
        totalAppointments: 100,
      });

      // Act
      const result = await service.getKPIs();

      // Assert
      expect(result.noShowRate).toBe(12.0);
      expect(mockRepository.getAppointmentStats).toHaveBeenCalledTimes(1);
    });

    it('should calculate confirmation rate correctly', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getAppointmentStats.mockResolvedValue(mockAppointmentStats);
      mockCalculator.calculateKPIs.mockReturnValue({
        noShowRate: 12.0,
        confirmationRate: 75.0,
        cancellationRate: 8.0,
        rescheduleRate: 5.0,
        totalAppointments: 100,
      });

      // Act
      const result = await service.getKPIs();

      // Assert
      expect(result.confirmationRate).toBe(75.0);
    });

    it('should return total appointments count', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getAppointmentStats.mockResolvedValue(mockAppointmentStats);
      mockCalculator.calculateKPIs.mockReturnValue({
        noShowRate: 12.0,
        confirmationRate: 75.0,
        cancellationRate: 8.0,
        rescheduleRate: 5.0,
        totalAppointments: 100,
      });

      // Act
      const result = await service.getKPIs();

      // Assert
      expect(result.totalAppointments).toBe(100);
    });

    it('should use cached data when available', async () => {
      // Arrange
      const cachedKPIs = {
        noShowRate: 12.0,
        confirmationRate: 75.0,
        cancellationRate: 8.0,
        rescheduleRate: 5.0,
        totalAppointments: 100,
      };
      mockCache.get.mockResolvedValue(cachedKPIs);

      // Act
      const result = await service.getKPIs();

      // Assert
      expect(result).toEqual(cachedKPIs);
      expect(mockRepository.getAppointmentStats).not.toHaveBeenCalled();
    });

    it('should cache results with 5 min TTL', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getAppointmentStats.mockResolvedValue(mockAppointmentStats);
      const expectedKPIs = {
        noShowRate: 12.0,
        confirmationRate: 75.0,
        cancellationRate: 8.0,
        rescheduleRate: 5.0,
        totalAppointments: 100,
      };
      mockCalculator.calculateKPIs.mockReturnValue(expectedKPIs);

      // Act
      await service.getKPIs();

      // Assert
      expect(mockCache.set).toHaveBeenCalledWith(
        'metrics:kpis',
        expectedKPIs,
        300 // 5 min in seconds
      );
    });

    it('should handle empty dataset gracefully', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getAppointmentStats.mockResolvedValue({
        total: 0,
        confirmed: 0,
        noShows: 0,
        cancelled: 0,
        rescheduled: 0,
        pending: 0,
      });
      mockCalculator.calculateKPIs.mockReturnValue({
        noShowRate: 0,
        confirmationRate: 0,
        cancellationRate: 0,
        rescheduleRate: 0,
        totalAppointments: 0,
      });

      // Act
      const result = await service.getKPIs();

      // Assert
      expect(result.totalAppointments).toBe(0);
      expect(result.noShowRate).toBe(0);
    });

    it('should throw error when repository fails', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getAppointmentStats.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(service.getKPIs()).rejects.toThrow('Database connection failed');
    });

    it('should accept date range filters', async () => {
      // Arrange
      const dateRange = {
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-17'),
      };
      mockCache.get.mockResolvedValue(null);
      mockRepository.getAppointmentStats.mockResolvedValue(mockAppointmentStats);
      mockCalculator.calculateKPIs.mockReturnValue({
        noShowRate: 12.0,
        confirmationRate: 75.0,
        cancellationRate: 8.0,
        rescheduleRate: 5.0,
        totalAppointments: 100,
      });

      // Act
      await service.getKPIs(dateRange);

      // Assert
      expect(mockRepository.getAppointmentStats).toHaveBeenCalledWith(dateRange);
    });
  });

  describe('getTrends', () => {
    it('should return 14 days of trend data', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getDailyTrends.mockResolvedValue(mockDailyTrends);

      // Act
      const result = await service.getTrends();

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('total');
      expect(result[0]).toHaveProperty('confirmed');
      expect(result[0]).toHaveProperty('noShows');
      expect(result[0]).toHaveProperty('noShowRate');
      expect(mockRepository.getDailyTrends).toHaveBeenCalledWith({ days: 14 });
    });

    it('should calculate daily no-show rate', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getDailyTrends.mockResolvedValue(mockDailyTrends);

      // Act
      const result = await service.getTrends();

      // Assert
      expect(result[0]).toHaveProperty('noShowRate');
      // First day: 1 no-show / 8 total = 12.5%
      expect(result[0].noShowRate).toBeCloseTo(12.5, 1);
    });

    it('should use cached trends when available', async () => {
      // Arrange
      const cachedTrends = mockDailyTrends.map(day => ({
        ...day,
        noShowRate: (day.noShows / day.total) * 100,
      }));
      mockCache.get.mockResolvedValue(cachedTrends);

      // Act
      const result = await service.getTrends();

      // Assert
      expect(result).toEqual(cachedTrends);
      expect(mockRepository.getDailyTrends).not.toHaveBeenCalled();
    });

    it('should cache trends with 5 min TTL', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getDailyTrends.mockResolvedValue(mockDailyTrends);

      // Act
      await service.getTrends();

      // Assert
      expect(mockCache.set).toHaveBeenCalledWith(
        'metrics:trends',
        expect.any(Array),
        300
      );
    });

    it('should handle days with zero appointments', async () => {
      // Arrange
      const trendsWithZero = [
        { date: '2025-11-15', total: 0, confirmed: 0, noShows: 0, cancelled: 0, rescheduled: 0 },
        { date: '2025-11-16', total: 10, confirmed: 8, noShows: 1, cancelled: 0, rescheduled: 1 },
      ];
      mockCache.get.mockResolvedValue(null);
      mockRepository.getDailyTrends.mockResolvedValue(trendsWithZero);

      // Act
      const result = await service.getTrends();

      // Assert
      expect(result[0].noShowRate).toBe(0); // No division by zero
    });
  });

  describe('getDistribution', () => {
    it('should return status distribution with counts', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getStatusDistribution.mockResolvedValue(mockStatusDistribution);

      // Act
      const result = await service.getDistribution();

      // Assert
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'CONFIRMADO', count: 75 }),
          expect.objectContaining({ status: 'NO_SHOW', count: 12 }),
          expect.objectContaining({ status: 'CANCELADO', count: 8 }),
          expect.objectContaining({ status: 'REAGENDADO', count: 5 }),
        ])
      );
    });

    it('should calculate percentage for each status', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getStatusDistribution.mockResolvedValue(mockStatusDistribution);

      // Act
      const result = await service.getDistribution();

      // Assert
      const confirmed = result.find(s => s.status === 'CONFIRMADO');
      expect(confirmed?.percentage).toBeCloseTo(75.0, 1);
    });

    it('should use cached distribution when available', async () => {
      // Arrange
      const cachedDist = mockStatusDistribution.map(s => ({
        ...s,
        percentage: (s.count / 100) * 100,
      }));
      mockCache.get.mockResolvedValue(cachedDist);

      // Act
      const result = await service.getDistribution();

      // Assert
      expect(result).toEqual(cachedDist);
      expect(mockRepository.getStatusDistribution).not.toHaveBeenCalled();
    });

    it('should handle empty distribution', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getStatusDistribution.mockResolvedValue([]);

      // Act
      const result = await service.getDistribution();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getRemindersStats', () => {
    it('should return total reminders sent', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getReminderStats.mockResolvedValue(mockReminderStats);

      // Act
      const result = await service.getRemindersStats();

      // Assert
      expect(result.totalSent).toBe(245);
    });

    it('should calculate response rate', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getReminderStats.mockResolvedValue(mockReminderStats);

      // Act
      const result = await service.getRemindersStats();

      // Assert
      expect(result.responseRate).toBeCloseTo(68.5, 1);
    });

    it('should return average reminders per appointment', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getReminderStats.mockResolvedValue(mockReminderStats);

      // Act
      const result = await service.getRemindersStats();

      // Assert
      expect(result.averagePerAppointment).toBeCloseTo(2.45, 2);
    });

    it('should break down by channel (WhatsApp, SMS)', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getReminderStats.mockResolvedValue(mockReminderStats);

      // Act
      const result = await service.getRemindersStats();

      // Assert
      expect(result.byChannel).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ channel: 'whatsapp', sent: 200 }),
          expect.objectContaining({ channel: 'sms', sent: 45 }),
        ])
      );
    });

    it('should use cached stats when available', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(mockReminderStats);

      // Act
      const result = await service.getRemindersStats();

      // Assert
      expect(result).toEqual(mockReminderStats);
      expect(mockRepository.getReminderStats).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle cache service errors', async () => {
      // Arrange
      mockCache.get.mockRejectedValue(new Error('Redis connection failed'));
      mockRepository.getAppointmentStats.mockResolvedValue(mockAppointmentStats);
      mockCalculator.calculateKPIs.mockReturnValue({
        noShowRate: 12.0,
        confirmationRate: 75.0,
        cancellationRate: 8.0,
        rescheduleRate: 5.0,
        totalAppointments: 100,
      });

      // Act
      const result = await service.getKPIs();

      // Assert
      expect(result.noShowRate).toBe(12.0); // Should fallback to DB
    });

    it('should throw error when repository fails', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockRepository.getAppointmentStats.mockRejectedValue(
        new Error('Query timeout')
      );

      // Act & Assert
      await expect(service.getKPIs()).rejects.toThrow('Query timeout');
    });
  });
});
