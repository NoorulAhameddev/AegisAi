import { cn } from "@/lib/utils";
import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "secondary"
    | "brand"
    | "error";
  size?: "sm" | "md" | "lg";
}

export function Badge({
  children,
  className,
  variant = "default",
  size = "md",
  ...props
}: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "bg-ink-800 text-ink-300 border-ink-700",
    success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
    warning: "bg-amber-500/10 text-amber-300 border-amber-500/25",
    danger: "bg-red-500/10 text-red-400 border-red-500/30",
    info: "bg-brand/10 text-brand border-brand/25",
    brand: "bg-brand text-ink-950 border-brand",
    secondary: "bg-white/5 text-ink-300 border-hair",
    error: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center border font-medium",
        variants[variant ?? "default"],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
