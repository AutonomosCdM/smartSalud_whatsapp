/**
 * TrendChart Component - Line chart for daily trends
 * smartSalud v5 - Metrics Dashboard
 */

'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DailyTrend } from '@/hooks/useMetrics';

interface TrendChartProps {
  data: DailyTrend[];
  loading?: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, loading = false }) => {
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
          Tendencias (14 días)
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">📊</p>
            <p>No hay datos de tendencias disponibles</p>
          </div>
        </div>
      </div>
    );
  }

  // Format date for display (DD/MM)
  const formattedData = data.map((item) => ({
    ...item,
    dateLabel: new Date(item.date).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
    }),
  }));

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
        Tendencias (14 días)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="dateLabel"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }}
          />
          <Line
            type="monotone"
            dataKey="confirmed"
            name="Confirmadas"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="noShows"
            name="No-Show"
            stroke="#EF4444"
            strokeWidth={2}
            dot={{ fill: '#EF4444', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="cancelled"
            name="Canceladas"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={{ fill: '#F59E0B', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
