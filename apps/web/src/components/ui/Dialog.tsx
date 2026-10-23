"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useRef } from "react";

interface DialogProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
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
  isOpen,
  onOpenChange,
  onClose,
  title,
  description,
  children,
  footer,
  closeButton = true,
  size = "md",
  className,
}: DialogProps) {
  const effectiveOpen = open ?? isOpen ?? false;
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange?.(false);
        onClose?.();
      }
    };

    if (effectiveOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "auto";
      };
    }
  }, [effectiveOpen, onOpenChange, onClose]);

  if (!effectiveOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "bg-black/70 backdrop-blur-sm transition-opacity duration-200",
        open ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange?.(false);
          onClose?.();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={cn(
          "w-full bg-ink-900",
          "border border-ink-700",
          "animate-scale-up max-h-[90vh] overflow-y-auto",
          sizeClasses[size],
          className,
        )}
      >
        {/* Header */}
        {(title || closeButton) && (
          <div className="flex items-center justify-between p-6 border-b border-hair">
            {title && (
              <div>
                <h2 className="font-display text-lg font-medium tracking-tight text-ink-100">{title}</h2>
                {description && (
                  <p className="text-sm text-ink-500 mt-1">{description}</p>
                )}
              </div>
            )}
            {closeButton && (
              <button
                onClick={() => {
                  onOpenChange?.(false);
                  onClose?.();
                }}
                className="p-2 text-ink-500 hover:text-ink-100 hover:bg-white/5 transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-6 border-t border-hair flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
