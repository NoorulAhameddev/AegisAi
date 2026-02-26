/**
 * Metric Card Component
 *
 * Displays a single metric with trend indicator and percentage change
 */

"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number; // Percentage change (-100 to 100)
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
  icon?: React.ReactNode;
  subtitle?: string;
}

export function MetricCard({
  title,
  value,
  change,
  trend,
  loading,
  icon,
  subtitle,
}: MetricCardProps) {
  // Auto-detect trend from change if not provided
  const actualTrend =
    trend ||
    (change && change > 0 ? "up" : change && change < 0 ? "down" : "neutral");

  const trendColors = {
    up: "text-green-600 dark:text-green-400",
    down: "text-red-600 dark:text-red-400",
    neutral: "text-gray-600 dark:text-gray-400",
  };

  const TrendIcon =
    actualTrend === "up"
      ? TrendingUp
      : actualTrend === "down"
        ? TrendingDown
        : Minus;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-purple-600 dark:text-purple-400">{icon}</div>
        )}
      </div>
      {change !== undefined && !loading && (
        <div
          className={`flex items-center gap-1 mt-3 text-sm ${trendColors[actualTrend]}`}
        >
          <TrendIcon className="w-4 h-4" />
          <span className="font-medium">
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            vs last period
          </span>
        </div>
      )}
    </div>
  );
}
