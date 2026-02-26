import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export function Toast({
  message,
  type = "info",
  duration = 3000,
  onClose,
}: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };

  const styles = {
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    error: "bg-red-500/10 border-red-500/20 text-red-400",
    warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl animate-slide-up min-w-[300px] max-w-md",
        styles[type],
      )}
    >
      <div className="shrink-0">{icons[type]}</div>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => {
          setVisible(false);
          onClose?.();
        }}
        className="shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string; type: ToastType }>
  >([]);

  const showToast = (message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return { toasts, showToast, removeToast };
}
