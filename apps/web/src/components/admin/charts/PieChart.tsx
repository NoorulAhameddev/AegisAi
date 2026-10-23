/**
 * Pie Chart Component
 *
 * Simple CSS-based donut chart using conic-gradient
 */

"use client";

export interface PieChartSegment {
  label: string;
  value: number;
  color: string;
}

export interface PieChartProps {
  data: PieChartSegment[];
  title: string;
  size?: number;
  donut?: boolean;
}

export function PieChart({
  data,
  title,
  size = 200,
  donut = true,
}: PieChartProps) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="bg-ink-850 border border-hair p-6">
        <h3 className="text-lg font-display font-medium tracking-tight text-ink-100 mb-4">
          {title}
        </h3>
        <div className="flex items-center justify-center h-48 text-ink-500">
          No data available
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, segment) => sum + segment.value, 0);

  // Build conic-gradient stops
  let currentPercent = 0;
  const gradientStops = data
    .map((segment) => {
      const percent = (segment.value / total) * 100;
      const start = currentPercent;
      const end = currentPercent + percent;
      currentPercent = end;
      return `${segment.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="bg-ink-850 border border-hair p-6">
      <h3 className="text-lg font-display font-medium tracking-tight text-ink-100 mb-4">
        {title}
      </h3>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Chart */}
        <div className="relative" style={{ width: size, height: size }}>
          <div
            className="w-full h-full rounded-full"
            style={{
              background: `conic-gradient(${gradientStops})`,
            }}
          />
          {donut && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[60%] h-[60%] rounded-full bg-ink-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-display font-medium tracking-tight text-ink-100">
                    {total.toLocaleString()}
                  </div>
                  <div className="text-xs text-ink-500">Total</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {data.map((segment, index) => {
            const percent = ((segment.value / total) * 100).toFixed(1);
            return (
              <div
                key={index}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="text-sm text-ink-300">
                    {segment.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-100">
                    {segment.value.toLocaleString()}
                  </span>
                  <span className="text-xs text-ink-500 w-12 text-right">
                    ({percent}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
