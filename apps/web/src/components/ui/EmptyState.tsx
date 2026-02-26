import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="relative mb-6 group">
          <div className="absolute inset-0 bg-purple-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative h-20 w-20 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center justify-center backdrop-blur-sm group-hover:border-purple-500/30 transition-all">
            <Icon className="h-9 w-9 text-zinc-600 group-hover:text-purple-400 transition-colors" />
          </div>
        </div>
      )}
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-zinc-400 max-w-md mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
