"use client";

import { useState, useEffect, useCallback } from "react";
import { ServerManagementContainer } from "./appointments/ServerManagementContainer";
import { ImportExcelButton } from "./appointments/ImportExcelButton";
import { CallDashboard } from "./CallDashboard";
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

  const loadAppointments = useCallback(async () => {
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
      setLastGoodData(prev => {
        if (prev.length > 0) {
          setServers(prev);
        }
        return prev;
      });

      console.error("[AppointmentTable] Fetch error:", apiError);
    }
  }, []);

  useEffect(() => {
    loadAppointments();

    // Refresh every 30 seconds to catch status updates from ElevenLabs calls
    const interval = setInterval(loadAppointments, 30000);
    return () => clearInterval(interval);
  }, [loadAppointments]);

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
                <h1 className="text-xl font-medium text-foreground">Cargando Citas...</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ImportExcelButton onImportSuccess={loadAppointments} />
              <button
                disabled
                className="px-4 py-2 bg-muted/50 text-muted-foreground rounded-lg flex items-center gap-2 cursor-not-allowed opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
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
                <h1 className="text-xl font-medium text-foreground">Error al Cargar Citas</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ImportExcelButton onImportSuccess={loadAppointments} />
              <button
                onClick={loadAppointments}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
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
              Intentar de Nuevo
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
                <h1 className="text-xl font-medium text-foreground">Próximas Citas</h1>
              </div>
              <div className="text-sm text-muted-foreground">
                0 citas cargadas
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ImportExcelButton onImportSuccess={loadAppointments} />
              <button
                onClick={loadAppointments}
                className="px-4 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
            </div>
          </div>

          {/* Empty Message */}
          <div className="bg-muted/30 border border-border/30 rounded-xl p-16 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No se encontraron citas</h2>
            <p className="text-muted-foreground mb-2">
              No hay citas programadas para los próximos 14 días.
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Última actualización: {lastUpdated.toLocaleString()}
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
      {/* Call Dashboard */}
      <CallDashboard />

      <div className="relative">
        {/* Status Bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {loadingState === "loading" ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-sm text-muted-foreground">Actualizando...</span>
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
                    {servers.length} citas cargadas
                  </span>
                </>
              )}
            </div>
            {lastUpdated && (
              <>
                <span className="text-xs text-muted-foreground">
                  Última actualización: {lastUpdated.toLocaleTimeString()}
                </span>
                <span className="text-xs text-muted-foreground opacity-60">
                  • Auto-refresh cada 30s
                </span>
              </>
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
              Reintentar
            </button>
          </div>
        )}

        {/* Main Table */}
        <ServerManagementContainer
          title="Próximas Citas"
          servers={servers}
          onRefresh={loadAppointments}
        />
      </div>
    </div>
  );
}
