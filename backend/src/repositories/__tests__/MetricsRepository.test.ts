/**
 * MetricsRepository Tests
 *
 * RED PHASE: These tests MUST fail - implementation pending
 *
 * Coverage:
 * - getAppointmentStats() - Aggregate stats with date filters
 * - getDailyTrends() - Daily grouping queries
 * - getStatusDistribution() - Count by status
 * - getReminderStats() - Reminder analytics
 * - SQL query correctness
 * - Date filtering
 *
 * Tests for MetricsRepository
 *
 * This test suite verifies the database interactions.
 */

import { MetricsRepository } from '../MetricsRepository';
import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
}));

describe('MetricsRepository', () => {
  let repository: MetricsRepository;
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    // Setup Prisma mock
    prismaMock = mockDeep<PrismaClient>();
    repository = new MetricsRepository(prismaMock as unknown as PrismaClient);
  });

  describe('getAppointmentStats', () => {
    it('should return aggregated appointment statistics', async () => {
      // Arrange
      const mockStatusCounts = [
        { status: 'CONFIRMADO' as const, _count: { id: 75 } },
        { status: 'NO_SHOW' as const, _count: { id: 12 } },
        { status: 'CANCELADO' as const, _count: { id: 8 } },
        { status: 'REAGENDADO' as const, _count: { id: 5 } },
      ];

      prismaMock.appointment.count.mockResolvedValue(100);
      prismaMock.appointment.groupBy.mockResolvedValue(mockStatusCounts as any);

      // Act
      const result = await repository.getAppointmentStats();

      // Assert
      expect(result).toEqual({
        total: 100,
        confirmed: 75,
        noShows: 12,
        cancelled: 8,
        rescheduled: 5,
        pending: 0,
      });
    });

    it('should filter by date range', async () => {
      // Arrange
      const dateRange = {
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-17'),
      };

      const mockStatusCounts = [
        { status: 'CONFIRMADO' as const, _count: { id: 35 } },
        { status: 'NO_SHOW' as const, _count: { id: 5 } },
        { status: 'CANCELADO' as const, _count: { id: 7 } },
        { status: 'REAGENDADO' as const, _count: { id: 3 } },
      ];

      prismaMock.appointment.count.mockResolvedValue(50);
      prismaMock.appointment.groupBy.mockResolvedValue(mockStatusCounts as any);

      // Act
      await repository.getAppointmentStats(dateRange);

      // Assert
      const where = {
        appointmentDate: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      };

      expect(prismaMock.appointment.count).toHaveBeenCalledWith({ where });
      expect(prismaMock.appointment.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where })
      );
    });

    it('should return 0 for empty results', async () => {
      // Arrange
      prismaMock.appointment.count.mockResolvedValue(0);
      prismaMock.appointment.groupBy.mockResolvedValue([]);

      // Act
      const result = await repository.getAppointmentStats();

      // Assert
      expect(result).toEqual({
        total: 0,
        confirmed: 0,
        noShows: 0,
        cancelled: 0,
        rescheduled: 0,
        pending: 0,
      });
    });

    it('should count appointments by status enum', async () => {
      // Arrange
      const mockStatusCounts = [
        { status: 'CONFIRMADO' as const, _count: { id: 1 } },
        { status: 'NO_SHOW' as const, _count: { id: 1 } },
        { status: 'AGENDADO' as const, _count: { id: 1 } },
      ];

      prismaMock.appointment.count.mockResolvedValue(3);
      prismaMock.appointment.groupBy.mockResolvedValue(mockStatusCounts as any);

      // Act
      const result = await repository.getAppointmentStats();

      // Assert
      expect(result.confirmed).toBe(1);
      expect(result.noShows).toBe(1);
      expect(result.pending).toBe(1);
    });

    it('should throw error on database failure', async () => {
      // Arrange
      prismaMock.appointment.count.mockRejectedValue(new Error('Connection timeout'));

      // Act & Assert
      await expect(repository.getAppointmentStats()).rejects.toThrow('Connection timeout');
    });
  });

  describe('getDailyTrends', () => {
    it('should return daily grouped statistics', async () => {
      // Arrange
      const mockAppointments = [
        ...Array(8).fill(null).map((_, i) => ({
          id: `${i}`,
          status: 'CONFIRMADO' as const,
          appointmentDate: new Date('2025-11-15'),
        })),
        { id: '8', status: 'NO_SHOW' as const, appointmentDate: new Date('2025-11-15') },
        { id: '9', status: 'AGENDADO' as const, appointmentDate: new Date('2025-11-15') },
        ...Array(10).fill(null).map((_, i) => ({
          id: `${i + 10}`,
          status: 'CONFIRMADO' as const,
          appointmentDate: new Date('2025-11-16'),
        })),
        { id: '20', status: 'NO_SHOW' as const, appointmentDate: new Date('2025-11-16') },
        { id: '21', status: 'NO_SHOW' as const, appointmentDate: new Date('2025-11-16') },
      ];

      prismaMock.appointment.findMany.mockResolvedValue(mockAppointments as any);

      // Act
      const result = await repository.getDailyTrends();

      // Assert
      expect(result).toEqual([
        { date: '2025-11-15', total: 10, confirmed: 8, noShows: 1, cancelled: 0, rescheduled: 0 },
        { date: '2025-11-16', total: 12, confirmed: 10, noShows: 2, cancelled: 0, rescheduled: 0 },
      ]);
    });

    it('should default to last 14 days', async () => {
      // Arrange
      prismaMock.appointment.findMany.mockResolvedValue([]);

      // Act
      await repository.getDailyTrends();

      // Assert
      expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            appointmentDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
        })
      );
    });

    it('should accept custom days parameter', async () => {
      // Arrange
      prismaMock.appointment.findMany.mockResolvedValue([]);

      // Act
      await repository.getDailyTrends({ days: 7 });

      // Assert
      const call = prismaMock.appointment.findMany.mock.calls[0][0];
      expect(call?.where?.appointmentDate).toBeDefined();

      // Verify 7 days range is set
      const where = call?.where as { appointmentDate: { gte: Date; lte: Date } };
      const daysDiff = Math.floor(
        (where.appointmentDate.lte.getTime() - where.appointmentDate.gte.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(7);
    });

    it('should order results by date ascending', async () => {
      // Arrange
      prismaMock.appointment.findMany.mockResolvedValue([]);

      // Act
      await repository.getDailyTrends();

      // Assert
      expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            appointmentDate: 'asc',
          },
        })
      );
    });

    it('should format dates as ISO strings', async () => {
      // Arrange
      const mockAppointments = [
        ...Array(8).fill(null).map((_, i) => ({
          id: `${i}`,
          status: 'CONFIRMADO' as const,
          appointmentDate: new Date('2025-11-15T00:00:00Z'),
        })),
        { id: '8', status: 'NO_SHOW' as const, appointmentDate: new Date('2025-11-15T00:00:00Z') },
        { id: '9', status: 'AGENDADO' as const, appointmentDate: new Date('2025-11-15T00:00:00Z') },
      ];

      prismaMock.appointment.findMany.mockResolvedValue(mockAppointments as any);

      // Act
      const result = await repository.getDailyTrends();

      // Assert
      expect(result[0].date).toBe('2025-11-15');
    });
  });

  describe('getStatusDistribution', () => {
    it('should return count by status', async () => {
      // Arrange
      const mockDistribution = [
        { status: 'CONFIRMADO', _count: { id: 75 } },
        { status: 'NO_SHOW', _count: { id: 12 } },
        { status: 'CANCELADO', _count: { id: 8 } },
        { status: 'REAGENDADO', _count: { id: 5 } },
      ];

      prismaMock.appointment.groupBy.mockResolvedValue(mockDistribution as any);

      // Act
      const result = await repository.getStatusDistribution();

      // Assert
      expect(result).toEqual([
        { status: 'CONFIRMADO', count: 75 },
        { status: 'NO_SHOW', count: 12 },
        { status: 'CANCELADO', count: 8 },
        { status: 'REAGENDADO', count: 5 },
      ]);
    });

    it('should group by status field', async () => {
      // Arrange
      prismaMock.appointment.groupBy.mockResolvedValue([]);

      // Act
      await repository.getStatusDistribution();

      // Assert
      expect(prismaMock.appointment.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['status'],
        })
      );
    });

    it('should filter by date range', async () => {
      // Arrange
      const dateRange = {
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-17'),
      };

      prismaMock.appointment.groupBy.mockResolvedValue([]);

      // Act
      await repository.getStatusDistribution(dateRange);

      // Assert
      expect(prismaMock.appointment.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            appointmentDate: {
              gte: dateRange.startDate,
              lte: dateRange.endDate,
            },
          },
        })
      );
    });

    it('should order by count descending', async () => {
      // Arrange
      prismaMock.appointment.groupBy.mockResolvedValue([]);

      // Act
      await repository.getStatusDistribution();

      // Assert
      expect(prismaMock.appointment.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
        })
      );
    });

    it('should handle empty results', async () => {
      // Arrange
      prismaMock.appointment.groupBy.mockResolvedValue([]);

      // Act
      const result = await repository.getStatusDistribution();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getReminderStats', () => {
    it('should return total reminders sent', async () => {
      // Arrange
      const mockReminders = [
        { id: '1', appointmentId: '1', type: 'WHATSAPP_72H' as const, sentAt: new Date(), responseReceived: true, responseText: 'sí' },
        { id: '2', appointmentId: '1', type: 'WHATSAPP_48H' as const, sentAt: new Date(), responseReceived: true, responseText: 'confirmo' },
        { id: '3', appointmentId: '2', type: 'WHATSAPP_24H' as const, sentAt: new Date(), responseReceived: false, responseText: null },
      ];

      prismaMock.reminderLog.count.mockResolvedValue(3);
      prismaMock.reminderLog.groupBy.mockResolvedValue([] as any);
      prismaMock.reminderLog.findMany.mockResolvedValue(mockReminders as any);
      prismaMock.reminderLog.groupBy.mockResolvedValue([
        { appointmentId: '1' },
        { appointmentId: '2' },
      ] as any);

      // Act
      const result = await repository.getReminderStats();

      // Assert
      expect(result.totalSent).toBe(3);
    });

    it('should calculate overall response rate', async () => {
      // Arrange
      const mockReminders = [
        { id: '1', appointmentId: '1', type: 'WHATSAPP_72H' as const, sentAt: new Date(), responseReceived: true, responseText: 'sí' },
        { id: '2', appointmentId: '2', type: 'WHATSAPP_48H' as const, sentAt: new Date(), responseReceived: true, responseText: 'confirmo' },
        { id: '3', appointmentId: '3', type: 'WHATSAPP_24H' as const, sentAt: new Date(), responseReceived: false, responseText: null },
        { id: '4', appointmentId: '4', type: 'VOICE_CALL' as const, sentAt: new Date(), responseReceived: false, responseText: null },
      ];

      prismaMock.reminderLog.count.mockResolvedValue(4);
      prismaMock.reminderLog.findMany.mockResolvedValue(mockReminders as any);
      prismaMock.reminderLog.groupBy.mockResolvedValue([
        { appointmentId: '1' },
        { appointmentId: '2' },
        { appointmentId: '3' },
        { appointmentId: '4' },
      ] as any);

      // Act
      const result = await repository.getReminderStats();

      // Assert
      expect(result.responseRate).toBe(50.0); // 2 / 4 * 100
    });

    it('should calculate average reminders per appointment', async () => {
      // Arrange
      const mockReminders = [
        { id: '1', appointmentId: '1', type: 'WHATSAPP_72H' as const, sentAt: new Date(), responseReceived: false, responseText: null },
        { id: '2', appointmentId: '1', type: 'WHATSAPP_48H' as const, sentAt: new Date(), responseReceived: false, responseText: null },
        { id: '3', appointmentId: '2', type: 'WHATSAPP_72H' as const, sentAt: new Date(), responseReceived: false, responseText: null },
      ];

      prismaMock.reminderLog.count.mockResolvedValue(3);
      prismaMock.reminderLog.findMany.mockResolvedValue(mockReminders as any);
      prismaMock.reminderLog.groupBy.mockResolvedValue([
        { appointmentId: '1' },
        { appointmentId: '2' },
      ] as any);

      // Act
      const result = await repository.getReminderStats();

      // Assert
      expect(result.averagePerAppointment).toBe(1.5); // 3 reminders / 2 appointments
    });

    it('should break down by type', async () => {
      // Arrange
      const mockReminders = [
        { id: '1', appointmentId: '1', type: 'WHATSAPP_72H' as const, sentAt: new Date(), responseReceived: true, responseText: 'sí' },
        { id: '2', appointmentId: '2', type: 'WHATSAPP_72H' as const, sentAt: new Date(), responseReceived: true, responseText: 'confirmo' },
        { id: '3', appointmentId: '3', type: 'WHATSAPP_72H' as const, sentAt: new Date(), responseReceived: false, responseText: null },
        { id: '4', appointmentId: '4', type: 'VOICE_CALL' as const, sentAt: new Date(), responseReceived: true, responseText: '1' },
        { id: '5', appointmentId: '5', type: 'VOICE_CALL' as const, sentAt: new Date(), responseReceived: false, responseText: null },
      ];

      prismaMock.reminderLog.count.mockResolvedValue(5);
      prismaMock.reminderLog.findMany.mockResolvedValue(mockReminders as any);
      prismaMock.reminderLog.groupBy.mockResolvedValue([
        { appointmentId: '1' },
        { appointmentId: '2' },
        { appointmentId: '3' },
        { appointmentId: '4' },
        { appointmentId: '5' },
      ] as any);

      // Act
      const result = await repository.getReminderStats();

      // Assert
      expect(result.byChannel).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            channel: 'whatsapp',
            sent: 3,
            responded: 2,
            responseRate: expect.any(Number),
          }),
          expect.objectContaining({
            channel: 'voice',
            sent: 2,
            responded: 1,
            responseRate: expect.any(Number),
          }),
        ])
      );
    });

    it('should handle no reminders gracefully', async () => {
      // Arrange
      prismaMock.reminderLog.findMany.mockResolvedValue([]);
      prismaMock.reminderLog.count.mockResolvedValue(0);
      prismaMock.reminderLog.groupBy.mockResolvedValue([] as any);

      // Act
      const result = await repository.getReminderStats();

      // Assert
      expect(result.totalSent).toBe(0);
      expect(result.responseRate).toBe(0);
      expect(result.averagePerAppointment).toBe(0);
    });

    it('should filter by date range', async () => {
      // Arrange
      const dateRange = {
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-17'),
      };

      prismaMock.reminderLog.findMany.mockResolvedValue([]);
      prismaMock.reminderLog.count.mockResolvedValue(0);
      prismaMock.reminderLog.groupBy.mockResolvedValue([] as any);

      // Act
      await repository.getReminderStats(dateRange);

      // Assert
      expect(prismaMock.reminderLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sentAt: {
              gte: dateRange.startDate,
              lte: dateRange.endDate,
            },
          },
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate Prisma errors', async () => {
      // Arrange
      prismaMock.appointment.count.mockRejectedValue(new Error('Prisma error'));

      // Act & Assert
      await expect(repository.getAppointmentStats()).rejects.toThrow('Prisma error');
    });

    it('should handle connection timeouts', async () => {
      // Arrange
      prismaMock.appointment.count.mockRejectedValue(new Error('Connection timeout'));

      // Act & Assert
      await expect(repository.getAppointmentStats()).rejects.toThrow(
        'Connection timeout'
      );
    });
  });
});
