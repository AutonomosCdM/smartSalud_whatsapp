/**
 * MetricsService
 *
 * Business logic layer for metrics
 * Orchestrates Repository + Calculator + Cache
 * Implements 5-minute caching strategy
 */

import { MetricsRepository, ReminderStatsResult } from '../repositories/MetricsRepository';
import { MetricsCalculator } from '../utils/MetricsCalculator';
import { CacheService } from './CacheService';
import { KPIMetrics, DailyTrend } from './metrics/types';

interface DateRangeInput {
  startDate: Date;
  endDate: Date;
}

interface TrendDataPoint extends DailyTrend {
  noShowRate: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export class MetricsService {
  private readonly CACHE_TTL = 300; // 5 minutes in seconds
  private readonly CACHE_KEYS = {
    kpis: 'metrics:kpis',
    trends: 'metrics:trends',
    distribution: 'metrics:distribution',
    reminders: 'metrics:reminders',
  };

  constructor(
    private repository: MetricsRepository,
    private calculator: MetricsCalculator,
    private cache?: CacheService
  ) {}

  /**
   * Get Key Performance Indicators
   * Cached for 5 minutes
   */
  async getKPIs(dateRange?: DateRangeInput): Promise<KPIMetrics> {
    // Try cache first
    if (this.cache) {
      try {
        const cached = await this.cache.get(this.CACHE_KEYS.kpis);
        if (cached) {
          return cached as KPIMetrics;
        }
      } catch (error) {
        // Cache error - fallback to database
        console.warn('Cache get failed, falling back to DB:', error);
      }
    }

    // Fetch from database
    const stats = await this.repository.getAppointmentStats(dateRange);

    // Calculate KPIs
    const kpis = this.calculator.calculateKPIs(stats);

    // Cache result
    if (this.cache) {
      try {
        await this.cache.set(this.CACHE_KEYS.kpis, kpis, this.CACHE_TTL);
      } catch (error) {
        // Cache set failed - not critical
        console.warn('Cache set failed:', error);
      }
    }

    return kpis;
  }

  /**
   * Get daily trends for last N days
   * Cached for 5 minutes
   */
  async getTrends(options?: { days?: number }): Promise<TrendDataPoint[]> {
    const days = options?.days || 14;
    // Try cache first
    if (this.cache) {
      try {
        const cached = await this.cache.get(this.CACHE_KEYS.trends);
        if (cached) {
          return cached as TrendDataPoint[];
        }
      } catch (error) {
        console.warn('Cache get failed, falling back to DB:', error);
      }
    }

    // Fetch from database
    const dailyTrends = await this.repository.getDailyTrends({ days });

    // Calculate no-show rate for each day
    const trendsWithRates = dailyTrends.map((day) => ({
      ...day,
      noShowRate: day.total > 0 ? (day.noShows / day.total) * 100 : 0,
    }));

    // Cache result
    if (this.cache) {
      try {
        await this.cache.set(this.CACHE_KEYS.trends, trendsWithRates, this.CACHE_TTL);
      } catch (error) {
        console.warn('Cache set failed:', error);
      }
    }

    return trendsWithRates;
  }

  /**
   * Get status distribution with percentages
   * Cached for 5 minutes
   */
  async getDistribution(dateRange?: DateRangeInput): Promise<StatusDistribution[]> {
    // Try cache first
    if (this.cache) {
      try {
        const cached = await this.cache.get(this.CACHE_KEYS.distribution);
        if (cached) {
          return cached as StatusDistribution[];
        }
      } catch (error) {
        console.warn('Cache get failed, falling back to DB:', error);
      }
    }

    // Fetch from database
    const distribution = await this.repository.getStatusDistribution(dateRange);

    // Calculate percentages
    const totalCount = distribution.reduce((sum, s) => sum + s.count, 0);
    const withPercentages = distribution.map((status) => ({
      ...status,
      percentage: totalCount > 0 ? (status.count / totalCount) * 100 : 0,
    }));

    // Cache result
    if (this.cache) {
      try {
        await this.cache.set(this.CACHE_KEYS.distribution, withPercentages, this.CACHE_TTL);
      } catch (error) {
        console.warn('Cache set failed:', error);
      }
    }

    return withPercentages;
  }

  /**
   * Get reminder statistics
   * Cached for 5 minutes
   */
  async getRemindersStats(dateRange?: DateRangeInput): Promise<ReminderStatsResult> {
    // Try cache first
    if (this.cache) {
      try {
        const cached = await this.cache.get(this.CACHE_KEYS.reminders);
        if (cached) {
          return cached as ReminderStatsResult;
        }
      } catch (error) {
        console.warn('Cache get failed, falling back to DB:', error);
      }
    }

    // Fetch from database
    const reminderStats = await this.repository.getReminderStats(dateRange);

    // Cache result
    if (this.cache) {
      try {
        await this.cache.set(this.CACHE_KEYS.reminders, reminderStats, this.CACHE_TTL);
      } catch (error) {
        console.warn('Cache set failed:', error);
      }
    }

    return reminderStats;
  }
}
