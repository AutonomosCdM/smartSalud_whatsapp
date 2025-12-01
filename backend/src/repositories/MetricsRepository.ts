/**
 * MetricsRepository
 *
 * Data access layer for metrics queries
 * Pure Prisma, no business logic
 * Handles date filters, grouping, aggregation
 */

import { PrismaClient } from '@prisma/client';
import {
  AppointmentStats,
  DailyTrend,
  StatusCount,
} from '../services/metrics/types';

interface DateRangeInput {
  startDate: Date;
  endDate: Date;
}

interface DailyTrendsOptions {
  days?: number;
}

export interface ReminderStatsResult {
  totalSent: number;
  responseRate: number;
  averagePerAppointment: number;
  byChannel: Array<{
    channel: string;
    sent: number;
    responded: number;
    responseRate: number;
  }>;
}

export class MetricsRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get aggregated appointment statistics
   * Counts by status instead of summing boolean fields
   */
  async getAppointmentStats(
    dateRange?: DateRangeInput
  ): Promise<AppointmentStats> {
    const where = dateRange
      ? {
          appointmentDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        }
      : {};

    // Get total count and status counts in parallel
    const [total, statusCounts] = await Promise.all([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.groupBy({
        where,
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    // Map status counts to expected format
    const stats = {
      total,
      confirmed: 0,
      noShows: 0,
      cancelled: 0,
      rescheduled: 0,
      pending: 0,
    };

    statusCounts.forEach((item) => {
      const count = item._count.id;
      switch (item.status) {
        case 'CONFIRMADO':
          stats.confirmed = count;
          break;
        case 'NO_SHOW':
          stats.noShows = count;
          break;
        case 'CANCELADO':
          stats.cancelled = count;
          break;
        case 'REAGENDADO':
          stats.rescheduled = count;
          break;
        case 'AGENDADO':
        case 'PENDIENTE_LLAMADA':
          stats.pending += count;
          break;
      }
    });

    return stats;
  }

  /**
   * Get daily trends for last N days
   * Groups by date, aggregates by status
   */
  async getDailyTrends(
    options: DailyTrendsOptions = {}
  ): Promise<DailyTrend[]> {
    const days = options.days || 14;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    // Fetch all appointments in date range
    const appointments = await this.prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        appointmentDate: true,
        status: true,
      },
      orderBy: {
        appointmentDate: 'asc',
      },
    });

    // Group by date manually (more flexible than Prisma groupBy)
    const dailyMap = new Map<string, {
      total: number;
      confirmed: number;
      noShows: number;
      cancelled: number;
      rescheduled: number;
    }>();

    appointments.forEach((apt) => {
      const dateKey = apt.appointmentDate.toISOString().split('T')[0];

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          total: 0,
          confirmed: 0,
          noShows: 0,
          cancelled: 0,
          rescheduled: 0,
        });
      }

      const day = dailyMap.get(dateKey)!;
      day.total++;

      switch (apt.status) {
        case 'CONFIRMADO':
          day.confirmed++;
          break;
        case 'NO_SHOW':
          day.noShows++;
          break;
        case 'CANCELADO':
          day.cancelled++;
          break;
        case 'REAGENDADO':
          day.rescheduled++;
          break;
      }
    });

    // Convert to array format
    const result: DailyTrend[] = [];
    dailyMap.forEach((stats, date) => {
      result.push({
        date,
        total: stats.total,
        confirmed: stats.confirmed,
        noShows: stats.noShows,
        cancelled: stats.cancelled,
        rescheduled: stats.rescheduled,
      });
    });

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get status distribution
   */
  async getStatusDistribution(
    dateRange?: DateRangeInput
  ): Promise<StatusCount[]> {
    const where = dateRange
      ? {
          appointmentDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        }
      : {};

    const groups = await this.prisma.appointment.groupBy({
      where,
      by: ['status'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    return groups.map((g) => ({
      status: g.status,
      count: g._count.id,
    }));
  }

  /**
   * Get reminder statistics
   */
  async getReminderStats(
    dateRange?: DateRangeInput
  ): Promise<ReminderStatsResult> {
    const where = dateRange
      ? {
          sentAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        }
      : {};

    const [totalSent, reminders, uniqueAppointments] = await Promise.all([
      this.prisma.reminderLog.count({ where }),
      this.prisma.reminderLog.findMany({
        where,
        select: {
          id: true,
          appointmentId: true,
          type: true,
          responseReceived: true,
        },
      }),
      this.prisma.reminderLog.groupBy({
        where,
        by: ['appointmentId'],
      }),
    ]);

    // Calculate overall stats
    const responded = reminders.filter((r) => r.responseReceived).length;
    const responseRate = totalSent > 0 ? (responded / totalSent) * 100 : 0;
    const averagePerAppointment =
      uniqueAppointments.length > 0
        ? totalSent / uniqueAppointments.length
        : 0;

    // Group by channel (map ReminderType to channel)
    const channelMap = new Map<string, { sent: number; responded: number }>();

    reminders.forEach((r) => {
      const channel = this.mapReminderTypeToChannel(r.type);

      if (!channelMap.has(channel)) {
        channelMap.set(channel, { sent: 0, responded: 0 });
      }

      const stats = channelMap.get(channel)!;
      stats.sent++;
      if (r.responseReceived) {
        stats.responded++;
      }
    });

    const byChannel = Array.from(channelMap.entries()).map(([channel, stats]) => ({
      channel,
      sent: stats.sent,
      responded: stats.responded,
      responseRate: stats.sent > 0 ? (stats.responded / stats.sent) * 100 : 0,
    }));

    return {
      totalSent,
      responseRate: Math.round(responseRate * 10) / 10, // Round to 1 decimal
      averagePerAppointment: Math.round(averagePerAppointment * 100) / 100, // Round to 2 decimals
      byChannel,
    };
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Map ReminderType enum to channel name
   */
  private mapReminderTypeToChannel(type: string): string {
    if (type.startsWith('WHATSAPP')) return 'whatsapp';
    if (type.startsWith('VOICE')) return 'voice';
    if (type.startsWith('HUMAN')) return 'human';
    return 'sms';
  }
}
