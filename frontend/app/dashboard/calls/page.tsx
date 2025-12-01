"use client";

import { useCallsDashboard } from "@/hooks/useCallsDashboard";
import CallsKPICard from "@/components/calls/CallsKPICard";
import UpcomingCallsList from "@/components/calls/UpcomingCallsList";
import CallTypeChart from "@/components/calls/CallTypeChart";
import ContactResultChart from "@/components/calls/ContactResultChart";

export default function CallsDashboardPage() {
  const { stats, upcomingCalls, loading, error, refetch } = useCallsDashboard();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">📞</div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-red-600 font-semibold mb-2">Error al cargar datos</p>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">📞</span>
            Dashboard de Llamadas
          </h1>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            🔄 Actualizar
          </button>
        </div>
        <p className="text-gray-600">
          Monitoreo en tiempo real de llamadas y recordatorios
        </p>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <CallsKPICard
            title="Llamadas Hoy"
            value={stats.todayTotal}
            icon="📊"
            color="blue"
            subtitle="Total del día"
          />
          <CallsKPICard
            title="Tasa de Contacto"
            value={`${stats.contactRate}%`}
            icon="✅"
            color="green"
            subtitle="Contactos exitosos"
          />
          <CallsKPICard
            title="En Cola"
            value={stats.queuedCount}
            icon="⏳"
            color="orange"
            subtitle="Llamadas pendientes"
          />
          <CallsKPICard
            title="Duración Promedio"
            value={`${Math.floor(stats.avgDuration / 60)}:${String(stats.avgDuration % 60).padStart(2, "0")}`}
            icon="⏱️"
            color="purple"
            subtitle="min:seg"
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Upcoming Calls (2/3 width) */}
        <div className="lg:col-span-2">
          <UpcomingCallsList calls={upcomingCalls} />
        </div>

        {/* Right Column - Charts (1/3 width) */}
        <div className="space-y-6">
          {stats && (
            <>
              <CallTypeChart data={stats.byStatus} />
              <ContactResultChart data={stats.byResult} />
            </>
          )}
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          ⏱️ Actualización automática cada 30 segundos
        </p>
      </div>
    </div>
  );
}
