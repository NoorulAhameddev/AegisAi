import { cn } from "@/lib/utils";
import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string | React.ReactNode;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="text-sm font-medium text-zinc-300 ml-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full rounded-xl bg-black/40 border border-white/10 py-3 px-4 text-white outline-none",
            "focus:border-purple-500/50 focus:bg-black/60 focus:ring-4 focus:ring-purple-500/10",
            "placeholder:text-zinc-600 transition-all duration-200",
            "resize-vertical min-h-[100px]",
            error &&
              "border-red-500/50 focus:border-red-500 focus:ring-red-500/10",
            className,
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-400 ml-1 flex items-center gap-1.5 animate-slide-up">
            <span className="h-1 w-1 rounded-full bg-red-400" />
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-zinc-500 ml-1">{helperText}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
