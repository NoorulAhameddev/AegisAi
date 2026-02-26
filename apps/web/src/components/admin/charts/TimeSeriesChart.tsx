/**
 * Time Series Chart Component
 *
 * Custom CSS-based line/bar chart for time-series data
 * Follows the pattern from ActivityChart.tsx
 */

"use client";

import { useState } from "react";

export interface TimeSeriesDataPoint {
  period: string;
  value: number;
  label?: string;
}

export interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  title: string;
  type?: "bar" | "line";
  color?: string;
  height?: number;
  showValues?: boolean;
}

export function TimeSeriesChart({
  data,
  title,
  type = "bar",
  color = "#8b5cf6", // Purple default
  height = 200,
  showValues = false,
}: TimeSeriesChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
        <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>

      <div className="relative" style={{ height: `${height}px` }}>
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border-t border-gray-200 dark:border-gray-700"
            />
          ))}
        </div>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 pr-2">
          {[4, 3, 2, 1, 0].map((i) => (
            <div key={i} className="text-right">
              {Math.round((maxValue * i) / 4)}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="absolute left-14 right-0 top-0 bottom-0 flex items-end justify-between gap-1">
          {data.map((point, index) => {
            const heightPercent = (point.value / maxValue) * 100;
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center justify-end relative group"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                    <div className="font-medium">
                      {point.label || point.period}
                    </div>
                    <div>{point.value.toLocaleString()}</div>
                  </div>
                )}

                {/* Bar or Line point */}
                {type === "bar" ? (
                  <div
                    className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: color,
                      opacity: isHovered ? 1 : 0.9,
                      transform: isHovered ? "scaleY(1.05)" : "scaleY(1)",
                      transformOrigin: "bottom",
                    }}
                  />
                ) : (
                  <div
                    className="w-3 h-3 rounded-full border-2 border-white dark:border-gray-800"
                    style={{
                      backgroundColor: color,
                      position: "absolute",
                      bottom: `${heightPercent}%`,
                    }}
                  />
                )}

                {/* Value label */}
                {showValues && point.value > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {point.value}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="mt-4 ml-14 flex items-start justify-between text-xs text-gray-500 dark:text-gray-400">
        {data.map((point, index) => {
          // Show every nth label to prevent overlap
          const showLabel =
            data.length <= 7 ||
            index % Math.ceil(data.length / 7) === 0 ||
            index === data.length - 1;

          return (
            <div
              key={index}
              className={`flex-1 text-center ${showLabel ? "" : "opacity-0"}`}
            >
              {new Date(point.period).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
