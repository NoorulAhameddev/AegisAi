"use client";

import {
  X,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export type NotificationType =
  | "success"
  | "error"
  | "info"
  | "warning"
  | "loading";

interface NotificationProps {
  title?: string;
  message?: string;
  type?: NotificationType;
  duration?: number;
  onClose?: () => void;
  action?: { label: string; onClick: () => void };
  closeButton?: boolean;
}

const typeConfig: Record<
  NotificationType,
  {
    icon: React.ReactNode;
    bg: string;
    border: string;
    textColor: string;
    iconColor: string;
  }
> = {
  success: {
    icon: <CheckCircle className="h-5 w-5" />,
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    textColor: "text-emerald-300",
    iconColor: "text-emerald-400",
  },
  error: {
    icon: <AlertCircle className="h-5 w-5" />,
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    textColor: "text-red-300",
    iconColor: "text-red-400",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    textColor: "text-yellow-300",
    iconColor: "text-yellow-400",
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    bg: "bg-brand/10",
    border: "border-brand/30",
    textColor: "text-brand",
    iconColor: "text-brand",
  },
  loading: {
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    bg: "bg-brand/10",
    border: "border-brand/30",
    textColor: "text-brand",
    iconColor: "text-brand",
  },
};

export function Notification({
  title,
  message,
  type = "info",
  duration = 5000,
  onClose,
  action,
  closeButton = true,
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = typeConfig[type];

  useEffect(() => {
    if (duration && type !== "loading") {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, type, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 border",
        "animate-slide-down transition-all duration-300",
        config.bg,
        config.border,
      )}
    >
      <div className={cn("shrink-0 mt-0.5", config.iconColor)}>
        {config.icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("font-medium text-sm", config.textColor)}>{title}</p>
        {message && <p className="text-xs text-ink-400 mt-1">{message}</p>}
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              "text-xs font-medium mt-2 px-3 py-1.5 rounded-none",
              "hover:bg-white/10 transition-colors",
              config.textColor,
            )}
          >
            {action.label}
          </button>
        )}
      </div>

      {closeButton && (
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="shrink-0 p-1 text-ink-500 hover:text-ink-100 hover:bg-white/10 rounded-none transition-colors"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Toast Container Component
interface ToastContainerProps {
  notifications: NotificationProps[];
  onRemove: (index: number) => void;
}

export function NotificationContainer({
  notifications,
  onRemove,
}: ToastContainerProps) {
  return (
    <div className="fixed top-6 right-6 z-50 space-y-3 pointer-events-none">
      {notifications.map((notif, idx) => (
        <div key={idx} className="pointer-events-auto">
          <Notification {...notif} onClose={() => onRemove(idx)} />
        </div>
      ))}
    </div>
  );
}
