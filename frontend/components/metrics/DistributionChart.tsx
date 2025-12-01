/**
 * DistributionChart Component - Pie chart for status distribution
 * smartSalud v5 - Metrics Dashboard
 */

'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { StatusDistribution } from '@/hooks/useMetrics';

interface DistributionChartProps {
  data: StatusDistribution[];
  loading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMADO: '#10B981',
  AGENDADO: '#3B82F6',
  REAGENDADO: '#F59E0B',
  CANCELADO: '#EF4444',
  PENDIENTE_LLAMADA: '#F97316',
  NO_SHOW: '#DC2626',
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMADO: 'Confirmadas',
  AGENDADO: 'Agendadas',
  REAGENDADO: 'Reagendadas',
  CANCELADO: 'Canceladas',
  PENDIENTE_LLAMADA: 'Pendiente Llamada',
  NO_SHOW: 'No-Show',
};

export const DistributionChart: React.FC<DistributionChartProps> = ({
  data,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Distribución por Estado
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">🥧</p>
            <p>No hay datos de distribución disponibles</p>
          </div>
        </div>
      </div>
    );
  }

  // Format data for pie chart
  const chartData = data.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    percentage: item.percentage,
  }));

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
        Distribución por Estado
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(props: any) => `${props.percent ? (props.percent * 100).toFixed(1) : 0}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((_entry, index) => {
              const status = data[index].status;
              const color = STATUS_COLORS[status] || '#6B7280';
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
            formatter={(value: number, name: string) => [
              `${value} citas`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }}
            formatter={(value) => <span style={{ color: '#9CA3AF' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
