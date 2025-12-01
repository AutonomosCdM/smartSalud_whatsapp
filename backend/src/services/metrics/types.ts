/**
 * Metrics Types
 *
 * Core type definitions for metrics system
 * Used by Calculator, Repository, Service layers
 */

// ==================== INPUT TYPES ====================

/**
 * Raw appointment statistics from database
 */
export interface AppointmentStats {
  total: number;
  confirmed: number;
  noShows: number;
  cancelled: number;
  rescheduled: number;
  pending: number;
}

/**
 * Daily trend data point
 */
export interface DailyTrend {
  date: string;
  total: number;
  noShows: number;
  confirmed: number;
  cancelled: number;
  rescheduled: number;
}

/**
 * Status distribution count
 */
export interface StatusCount {
  status: string;
  count: number;
}

/**
 * Reminder statistics
 */
export interface ReminderStats {
  type: string; // '72h', '48h', '24h', 'voice'
  sent: number;
  responded: number;
}

/**
 * Date range filter
 */
export interface DateRange {
  start: Date;
  end: Date;
}

// ==================== OUTPUT TYPES ====================

/**
 * Calculated KPI metrics
 */
export interface KPIMetrics {
  totalAppointments: number;
  noShowRate: number;
  confirmationRate: number;
  cancellationRate: number;
  rescheduleRate: number;
}

/**
 * Trend data with direction
 */
export interface TrendData {
  change: number; // Percentage change
  direction: 'up' | 'down' | 'stable';
}

/**
 * Daily no-show rate data
 */
export interface DailyNoShowData {
  total: number;
  noShows: number;
}

// ==================== DASHBOARD TYPES ====================

/**
 * Complete dashboard metrics
 */
export interface DashboardMetrics {
  kpis: KPIMetrics;
  trends: {
    noShowRate: TrendData;
    confirmationRate: TrendData;
  };
  dailyTrends: DailyTrend[];
  statusDistribution: StatusCount[];
  reminderStats: ReminderStats[];
}
