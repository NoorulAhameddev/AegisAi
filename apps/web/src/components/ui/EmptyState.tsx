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
        <div className="relative mb-6">
          <div className="h-20 w-20 bg-ink-850 border border-hair flex items-center justify-center">
            <Icon className="h-9 w-9 text-brand" />
          </div>
        </div>
      )}
      <h3 className="font-display text-xl font-medium tracking-tight text-ink-100 mb-2">{title}</h3>
      {description && (
        <p className="text-ink-500 max-w-md mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-bracket bg-brand text-ink-950 px-6 py-2.5 font-medium hover:bg-brand-dim transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
