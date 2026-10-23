/**
 * Live Indicator Component
 *
 * Pulsing indicator for real-time data streams
 */

"use client";

export interface LiveIndicatorProps {
  active?: boolean;
  label?: string;
}

export function LiveIndicator({
  active = true,
  label = "Live",
}: LiveIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        {/* Outer pulse ring */}
        {active && (
          <span className="absolute inline-flex h-3 w-3 rounded-[2px] bg-green-400 opacity-75 animate-ping" />
        )}
        {/* Solid dot */}
        <span
          className={`relative inline-flex h-3 w-3 rounded-[2px] ${
            active ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      </div>
      <span
        className={`text-sm font-medium ${active ? "text-green-400" : "text-ink-500"}`}
      >
        {label}
      </span>
    </div>
  );
}
