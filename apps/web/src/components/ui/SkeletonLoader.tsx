"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function SkeletonLoader({ className, count = 1 }: SkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "bg-ink-800 animate-pulse",
            className || "h-4 w-full",
          )}
        />
      ))}
    </div>
  );
}

export function CardSkeletonLoader() {
  return (
    <div className="border border-hair p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 bg-ink-800 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 bg-ink-800 animate-pulse" />
          <div className="h-3 w-1/2 bg-ink-800 animate-pulse" />
        </div>
      </div>
      <SkeletonLoader count={3} className="h-3 w-full" />
    </div>
  );
}
