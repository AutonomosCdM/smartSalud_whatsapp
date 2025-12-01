/**
 * KPICard Component - Reusable metric card
 * smartSalud v5 - Metrics Dashboard
 */

import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'purple';
  loading?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'blue',
  loading = false,
}) => {
  const colorClasses = {
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  const trendColorClass = trend?.isPositive ? 'text-green-400' : 'text-red-400';
  const trendIcon = trend?.isPositive ? '↑' : '↓';

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-lg border ${colorClasses[color]} p-6 hover:bg-gray-800/70 transition-all duration-200`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          {title}
        </h3>
        {icon && (
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold text-white">
          {value}
        </span>
        {trend && (
          <span className={`text-sm font-medium ${trendColorClass}`}>
            {trendIcon} {Math.abs(trend.value)}%
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-sm text-gray-500">
          {subtitle}
        </p>
      )}
    </div>
  );
};
