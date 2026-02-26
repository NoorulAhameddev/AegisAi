import { cn } from "@/lib/utils";
import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "purple"
    | "secondary"
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
    default: "bg-zinc-800/50 text-zinc-300 border-zinc-700/50",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    danger: "bg-red-500/10 text-red-400 border-red-500/20",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    secondary: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-medium",
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
