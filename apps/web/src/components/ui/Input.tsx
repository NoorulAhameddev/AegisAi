import { cn } from "@/lib/utils";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string | React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, helperText, type = "text", ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="text-sm font-medium text-zinc-300 ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-400 transition-colors pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              "w-full rounded-xl bg-black/40 border border-white/10 py-3 text-white outline-none",
              "focus:border-purple-500/50 focus:bg-black/60 focus:ring-4 focus:ring-purple-500/10",
              "placeholder:text-zinc-600 transition-all duration-200",
              icon ? "px-10" : "px-4",
              error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/10",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-red-400 ml-1 flex items-center gap-1.5 animate-slide-up">
            <span className="h-1 w-1 rounded-full bg-red-400" />
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-zinc-500 ml-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
