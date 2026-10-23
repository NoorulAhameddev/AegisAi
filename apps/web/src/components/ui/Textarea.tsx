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
          <label className="eyebrow ml-1">{label}</label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full rounded-none bg-ink-900 border border-ink-700 py-3 px-4 text-ink-100 outline-none",
            "focus:border-brand focus:bg-ink-850",
            "placeholder:text-ink-500 transition-colors",
            "resize-vertical min-h-[100px]",
            error && "border-red-500/60 focus:border-red-500",
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
          <p className="text-sm text-ink-500 ml-1">{helperText}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
