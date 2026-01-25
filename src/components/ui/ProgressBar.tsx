import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "gradient" | "success" | "warning" | "danger";
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  size = "md",
  variant = "default",
  className
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4"
  };

  const variantClasses = {
    default: "bg-white",
    gradient: "bg-gradient-to-r from-purple-500 to-blue-500",
    success: "bg-emerald-500",
    warning: "bg-yellow-500",
    danger: "bg-red-500"
  };

  return (
    <div className={cn("w-full", className)}>
      <div className={cn(
        "w-full rounded-full bg-zinc-800/50 overflow-hidden backdrop-blur-sm border border-white/5",
        sizeClasses[size]
      )}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-2 flex justify-between items-center text-xs text-zinc-500">
          <span>{value} / {max}</span>
          <span className="font-semibold">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
}
