"use client";

import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  icon?: ReactNode;
}

export function Collapsible({
  title,
  description,
  children,
  defaultOpen = false,
  className,
  icon,
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "border border-hair overflow-hidden",
        className,
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-3 text-left">
          {icon && (
            <span className="text-ink-400 group-hover:text-ink-300">
              {icon}
            </span>
          )}
          <div>
            <h3 className="font-medium text-ink-100">{title}</h3>
            {description && (
              <p className="text-xs text-ink-500 mt-1">{description}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-ink-500 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-hair bg-ink-900/30 animate-slide-down">
          {children}
        </div>
      )}
    </div>
  );
}
