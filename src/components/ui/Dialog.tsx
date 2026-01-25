"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useRef } from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeButton?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeButton = true,
  size = "md",
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "auto";
      };
    }
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "bg-black/60 backdrop-blur-sm transition-opacity duration-200",
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div
        ref={dialogRef}
        className={cn(
          "w-full rounded-2xl bg-zinc-900/95 backdrop-blur-xl",
          "border border-white/10 shadow-2xl shadow-black/50",
          "animate-scale-up max-h-[90vh] overflow-y-auto",
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        {(title || closeButton) && (
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            {title && (
              <div>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                {description && (
                  <p className="text-sm text-zinc-400 mt-1">{description}</p>
                )}
              </div>
            )}
            {closeButton && (
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
