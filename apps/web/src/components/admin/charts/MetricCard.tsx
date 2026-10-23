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
    up: "text-green-400",
    down: "text-red-400",
    neutral: "text-ink-500",
  };

  const TrendIcon =
    actualTrend === "up"
      ? TrendingUp
      : actualTrend === "down"
        ? TrendingDown
        : Minus;

  return (
    <div className="bg-ink-850 border border-hair p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-ink-300 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-ink-700 animate-pulse" />
          ) : (
            <p className="text-3xl font-display font-medium tracking-tight text-ink-100">
              {value}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-ink-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-brand">{icon}</div>
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
          <span className="text-ink-500">vs last period</span>
        </div>
      )}
    </div>
  );
}
