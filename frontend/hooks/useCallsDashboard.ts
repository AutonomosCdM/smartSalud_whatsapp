"use client";

import { useEffect, useState } from "react";
import { CallsDashboardStats, UpcomingCall } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function useCallsDashboard(refreshInterval = 30000) {
  const [stats, setStats] = useState<CallsDashboardStats | null>(null);
  const [upcomingCalls, setUpcomingCalls] = useState<UpcomingCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      console.log("[useCallsDashboard] Fetching data from:", API_URL);

      const [statsRes, upcomingRes] = await Promise.all([
        fetch(`${API_URL}/api/calls/dashboard-stats`),
        fetch(`${API_URL}/api/calls/upcoming?limit=10`),
      ]);

      console.log("[useCallsDashboard] Stats response:", statsRes.status);
      console.log("[useCallsDashboard] Upcoming response:", upcomingRes.status);

      if (!statsRes.ok || !upcomingRes.ok) {
        throw new Error(`Failed to fetch: stats=${statsRes.status}, upcoming=${upcomingRes.status}`);
      }

      const statsData = await statsRes.json();
      const upcomingData = await upcomingRes.json();

      console.log("[useCallsDashboard] Stats data:", statsData);
      console.log("[useCallsDashboard] Upcoming data:", upcomingData);

      setStats(statsData.stats);
      setUpcomingCalls(upcomingData.data || []);
      setError(null);
    } catch (err) {
      console.error("[useCallsDashboard] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const interval = setInterval(fetchDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { stats, upcomingCalls, loading, error, refetch: fetchDashboardData };
}
