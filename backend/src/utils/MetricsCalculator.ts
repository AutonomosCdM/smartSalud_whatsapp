/**
 * MetricsCalculator
 *
 * Pure calculation functions for metrics
 * No dependencies, no side effects
 * All formulas match George's specifications
 */

import {
  AppointmentStats,
  KPIMetrics,
  TrendData,
  DailyNoShowData,
} from '../services/metrics/types';

export class MetricsCalculator {
  /**
   * Calculate all KPIs from appointment stats
   */
  calculateKPIs(stats: AppointmentStats): KPIMetrics {
    const total = stats.total || 0;
    const confirmed = this.coerceNumber(stats.confirmed);
    const noShows = this.coerceNumber(stats.noShows);
    const cancelled = this.coerceNumber(stats.cancelled);
    const rescheduled = this.coerceNumber(stats.rescheduled);

    return {
      totalAppointments: total,
      noShowRate: this.calculatePercentage(noShows, total),
      confirmationRate: this.calculatePercentage(confirmed, total),
      cancellationRate: this.calculatePercentage(cancelled, total),
      rescheduleRate: this.calculatePercentage(rescheduled, total),
    };
  }

  /**
   * Calculate trend between current and previous values
   */
  calculateTrend(current: number, previous: number): TrendData {
    // Prevent division by zero
    if (previous === 0) {
      return {
        change: 0,
        direction: 'stable',
      };
    }

    const change = ((current - previous) / previous) * 100;
    const roundedChange = this.round(change, 2);

    let direction: 'up' | 'down' | 'stable';
    if (roundedChange > 0) {
      direction = 'up';
    } else if (roundedChange < 0) {
      direction = 'down';
    } else {
      direction = 'stable';
    }

    return {
      change: roundedChange,
      direction,
    };
  }

  /**
   * Calculate safe percentage (part/total * 100)
   * Returns 0 if total is 0
   */
  calculatePercentage(part: number, total: number): number {
    if (total === 0) {
      return 0;
    }

    const percentage = (part / total) * 100;
    return this.round(percentage, 2);
  }

  /**
   * Calculate daily no-show rate
   */
  calculateDailyNoShowRate(dayData: DailyNoShowData): number {
    return this.calculatePercentage(dayData.noShows, dayData.total);
  }

  /**
   * Calculate average reminders per appointment
   */
  calculateAverageReminders(
    totalReminders: number,
    totalAppointments: number
  ): number {
    if (totalAppointments === 0) {
      return 0;
    }

    const average = totalReminders / totalAppointments;
    return this.round(average, 2);
  }

  /**
   * Calculate reminder response rate
   */
  calculateReminderResponseRate(sent: number, responded: number): number {
    return this.calculatePercentage(responded, sent);
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Round number to specified decimal places
   */
  private round(value: number, decimals: number): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }

  /**
   * Coerce null/undefined to 0, keep numbers (including negative)
   */
  private coerceNumber(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }
    return Number(value) || 0;
  }
}
