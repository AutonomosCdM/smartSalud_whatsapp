/**
 * useMetrics Hook - SWR data fetching for metrics dashboard
 * smartSalud v5 - Metrics Dashboard
 */

import useSWR from 'swr';
import { getApiBaseUrl } from '@/lib/api';

/**
 * KPI Metrics Structure
 */
export interface KPIMetrics {
  totalAppointments: number;
  noShowRate: number;
  confirmationRate: number;
  cancellationRate: number;
  rescheduleRate: number;
  atRiskCount?: number;
}

/**
 * Daily Trend Structure
 */
export interface DailyTrend {
  date: string;
  total: number;
  confirmed: number;
  noShows: number;
  cancelled: number;
  rescheduled: number;
}

/**
 * Status Distribution Structure
 */
export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

/**
 * Reminder Statistics Structure
 */
export interface ReminderStats {
  totalSent: number;
  responseRate: number;
  averagePerAppointment: number;
  byChannel: Array<{
    channel: string;
    count: number;
    responseRate: number;
  }>;
}

/**
 * Generic fetcher for SWR
 */
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  const data = await response.json();
  return data.data || data;
};

/**
 * Hook: Fetch KPI metrics
 */
export function useKPIs(dateRange?: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (dateRange?.start) params.append('startDate', dateRange.start);
  if (dateRange?.end) params.append('endDate', dateRange.end);

  const url = `${getApiBaseUrl()}/api/metrics/kpis${params.toString() ? `?${params.toString()}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<KPIMetrics>(url, fetcher, {
    refreshInterval: 300000, // Refresh every 5 minutes
    revalidateOnFocus: true,
  });

  return {
    kpis: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

/**
 * Hook: Fetch daily trends
 */
export function useTrends(days: number = 14) {
  const url = `${getApiBaseUrl()}/api/metrics/trends?days=${days}`;

  const { data, error, isLoading, mutate } = useSWR<DailyTrend[]>(url, fetcher, {
    refreshInterval: 300000,
    revalidateOnFocus: true,
  });

  return {
    trends: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

/**
 * Hook: Fetch status distribution
 */
export function useDistribution(dateRange?: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (dateRange?.start) params.append('startDate', dateRange.start);
  if (dateRange?.end) params.append('endDate', dateRange.end);

  const url = `${getApiBaseUrl()}/api/metrics/distribution${params.toString() ? `?${params.toString()}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<StatusDistribution[]>(url, fetcher, {
    refreshInterval: 300000,
    revalidateOnFocus: true,
  });

  return {
    distribution: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

/**
 * Hook: Fetch reminder statistics
 */
export function useReminderStats(dateRange?: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (dateRange?.start) params.append('startDate', dateRange.start);
  if (dateRange?.end) params.append('endDate', dateRange.end);

  const url = `${getApiBaseUrl()}/api/metrics/reminders${params.toString() ? `?${params.toString()}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<ReminderStats>(url, fetcher, {
    refreshInterval: 300000,
    revalidateOnFocus: true,
  });

  return {
    reminderStats: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}
