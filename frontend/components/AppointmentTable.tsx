"use client";

import { useState, useEffect } from "react";
import { ServerManagementContainer } from "./appointments/ServerManagementContainer";
import { ImportExcelButton } from "./appointments/ImportExcelButton";
import type { Server } from "@/lib/types";
import { RefreshCw, AlertCircle } from "lucide-react";
import { fetchAppointments, handleApiError, type ApiError } from "@/lib/api";

type LoadingState = "idle" | "loading" | "success" | "error";

export function AppointmentTable() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const [error, setError] = useState<ApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastGoodData, setLastGoodData] = useState<Server[]>([]);

  const loadAppointments = async () => {
    setLoadingState("loading");
    setError(null);

    try {
      const transformedServers = await fetchAppointments(336); // 14 days
      setServers(transformedServers);
      setLastGoodData(transformedServers);
      setLastUpdated(new Date());
      setLoadingState("success");
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError);
      setLoadingState("error");

      // Keep last known good data visible on error
      if (lastGoodData.length > 0) {
        setServers(lastGoodData);
      }

      console.error("[AppointmentTable] Fetch error:", apiError);
    }
  };

  useEffect(() => {
    loadAppointments();

    // Refresh every 30 minutes
    const interval = setInterval(loadAppointments, 1800000);
    return () => clearInterval(interval);
  }, []);

  // Loading State
  if (loadingState === "loading" && servers.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="relative border border-border/30 rounded-2xl p-6 bg-card">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <h1 className="text-xl font-medium text-foreground">Loading Appointments...</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ImportExcelButton onImportSuccess={loadAppointments} />
              <button
                disabled
                className="px-4 py-2 bg-muted/50 text-muted-foreground rounded-lg flex items-center gap-2 cursor-not-allowed opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Skeleton Loading */}
          <div className="space-y-3">
            {/* Headers */}
            <div className="grid grid-cols-11 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1">No</div>
              <div className="col-span-2">Paciente</div>
              <div className="col-span-1">Especialidad</div>
              <div className="col-span-2">Doctor</div>
              <div className="col-span-2">Teléfono</div>
              <div className="col-span-2">Hora</div>
              <div className="col-span-1">Estado</div>
            </div>

            {/* Skeleton Rows */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted/30 border border-border/30 rounded-xl p-4 animate-pulse">
                <div className="grid grid-cols-11 gap-4 items-center">
                  <div className="col-span-1">
                    <div className="w-8 h-8 bg-muted rounded" />
                  </div>
                  <div className="col-span-2">
                    <div className="w-full h-6 bg-muted rounded" />
                  </div>
                  <div className="col-span-1">
                    <div className="w-8 h-8 bg-muted rounded-full mx-auto" />
                  </div>
                  <div className="col-span-2">
                    <div className="w-full h-6 bg-muted rounded" />
                  </div>
                  <div className="col-span-2">
                    <div className="w-full h-6 bg-muted rounded" />
                  </div>
                  <div className="col-span-2">
                    <div className="w-full h-6 bg-muted rounded" />
                  </div>
                  <div className="col-span-1">
                    <div className="w-16 h-6 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (loadingState === "error" && servers.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="relative border border-red-500/30 rounded-2xl p-6 bg-card">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <h1 className="text-xl font-medium text-foreground">Error Loading Appointments</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ImportExcelButton onImportSuccess={loadAppointments} />
              <button
                onClick={loadAppointments}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>

          {/* Error Message */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">{error?.type.replace(/_/g, " ")}</h2>
            <p className="text-muted-foreground mb-6">{error?.message}</p>
            <button
              onClick={loadAppointments}
              className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-lg flex items-center gap-2 mx-auto transition-colors font-medium"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (loadingState === "success" && servers.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="relative border border-border/30 rounded-2xl p-6 bg-card">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <h1 className="text-xl font-medium text-foreground">Upcoming Appointments</h1>
              </div>
              <div className="text-sm text-muted-foreground">
                0 appointments loaded
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ImportExcelButton onImportSuccess={loadAppointments} />
              <button
                onClick={loadAppointments}
                className="px-4 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Empty Message */}
          <div className="bg-muted/30 border border-border/30 rounded-xl p-16 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No Appointments Found</h2>
            <p className="text-muted-foreground mb-2">
              There are no appointments scheduled in the next 14 days.
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success State with Data
  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="relative">
        {/* Status Bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {loadingState === "loading" ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-sm text-muted-foreground">Refreshing...</span>
                </>
              ) : loadingState === "error" ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm text-red-400">Error: {error?.message}</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">
                    {servers.length} appointments loaded
                  </span>
                </>
              )}
            </div>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Error Banner (if error but showing last good data) */}
        {loadingState === "error" && servers.length > 0 && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-sm text-red-400">
                {error?.type.replace(/_/g, " ")}: {error?.message}
              </span>
            </div>
            <button
              onClick={loadAppointments}
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Table */}
        <ServerManagementContainer
          title="Upcoming Appointments"
          servers={servers}
        />
      </div>
    </div>
  );
}
