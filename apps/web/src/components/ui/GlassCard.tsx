import { cn } from "@/lib/utils";
import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradient?: "brand" | "neutral" | "none";
  interactive?: boolean;
}

export function GlassCard({
  children,
  className,
  gradient = "none",
  interactive = false,
  ...props
}: GlassCardProps) {
  const accentStyles = {
    brand: "border-l-brand hover:border-l-brand",
    neutral: "hover:border-ink-600",
    none: "",
  };

  return (
    <div
      className={cn(
        "relative bg-ink-850 border border-hair p-6",
        interactive && "cursor-pointer hover:bg-ink-800 transition-colors",
        interactive && accentStyles[gradient],
        className,
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
