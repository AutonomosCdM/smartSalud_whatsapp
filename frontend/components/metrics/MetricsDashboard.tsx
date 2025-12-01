/**
 * MetricsDashboard Component - Main metrics dashboard container
 * smartSalud v5 - Metrics Dashboard
 */

'use client';

import React from 'react';
import { KPICard } from './KPICard';
import { TrendChart } from './TrendChart';
import { DistributionChart } from './DistributionChart';
import { useKPIs, useTrends, useDistribution } from '@/hooks/useMetrics';

export const MetricsDashboard: React.FC = () => {
  const { kpis, isLoading: kpisLoading, isError: kpisError } = useKPIs();
  const { trends, isLoading: trendsLoading, isError: trendsError } = useTrends(14);
  const { distribution, isLoading: distributionLoading, isError: distributionError } = useDistribution();

  // Error states
  if (kpisError || trendsError || distributionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
            <p className="text-red-400 text-lg mb-2">⚠️ Error al cargar métricas</p>
            <p className="text-gray-400 text-sm">
              Verifica que el backend esté corriendo en{' '}
              <code className="bg-gray-800 px-2 py-1 rounded">http://localhost:3001</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            📊 Dashboard de Métricas
          </h1>
          <p className="text-gray-400">
            Monitoreo en tiempo real de citas médicas y recordatorios
          </p>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Citas"
            value={kpis?.totalAppointments ?? 0}
            subtitle="Citas activas en el sistema"
            icon={<span className="text-2xl">📅</span>}
            color="blue"
            loading={kpisLoading}
          />

          <KPICard
            title="Tasa No-Show"
            value={kpis ? `${kpis.noShowRate}%` : '0%'}
            subtitle="Métrica oro - Objetivo: <5%"
            icon={<span className="text-2xl">📉</span>}
            color={
              kpis && kpis.noShowRate > 10
                ? 'red'
                : kpis && kpis.noShowRate > 5
                ? 'yellow'
                : 'green'
            }
            loading={kpisLoading}
          />

          <KPICard
            title="Tasa Confirmación"
            value={kpis ? `${kpis.confirmationRate}%` : '0%'}
            subtitle="Citas confirmadas por pacientes"
            icon={<span className="text-2xl">✅</span>}
            color={
              kpis && kpis.confirmationRate > 75
                ? 'green'
                : kpis && kpis.confirmationRate > 50
                ? 'yellow'
                : 'red'
            }
            loading={kpisLoading}
          />

          <KPICard
            title="En Riesgo"
            value={kpis?.atRiskCount ?? 0}
            subtitle="Citas pendiente llamada"
            icon={<span className="text-2xl">⚠️</span>}
            color={
              kpis && (kpis.atRiskCount ?? 0) > 10
                ? 'red'
                : kpis && (kpis.atRiskCount ?? 0) > 0
                ? 'yellow'
                : 'green'
            }
            loading={kpisLoading}
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <KPICard
            title="Tasa Cancelación"
            value={kpis ? `${kpis.cancellationRate}%` : '0%'}
            subtitle="Canceladas por pacientes"
            icon={<span className="text-2xl">❌</span>}
            color="red"
            loading={kpisLoading}
          />

          <KPICard
            title="Tasa Reagendamiento"
            value={kpis ? `${kpis.rescheduleRate}%` : '0%'}
            subtitle="Reagendadas exitosamente"
            icon={<span className="text-2xl">🔄</span>}
            color="purple"
            loading={kpisLoading}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendChart data={trends} loading={trendsLoading} />
          <DistributionChart data={distribution} loading={distributionLoading} />
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Los datos se actualizan cada 5 minutos automáticamente</p>
        </div>
      </div>
    </div>
  );
};
