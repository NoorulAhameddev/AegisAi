import { cn } from "@/lib/utils";
import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  bracket?: boolean;
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  icon,
  bracket = false,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";

  const variants = {
    primary: "bg-brand text-ink-950 hover:bg-brand-dim",
    secondary:
      "bg-transparent text-ink-100 border border-hair hover:border-ink-500 hover:text-white",
    ghost: "text-ink-300 hover:text-ink-100 hover:bg-white/5",
    danger:
      "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const mono =
    variant === "primary" || variant === "secondary"
      ? "font-mono text-[0.7rem] uppercase tracking-[0.12em]"
      : "";

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        mono,
        bracket && "btn-bracket",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {!loading && icon && icon}
      {children}
    </button>
  );
}
