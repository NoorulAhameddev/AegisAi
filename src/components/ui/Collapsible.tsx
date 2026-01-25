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
    <div className={cn("rounded-lg border border-white/10 overflow-hidden", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-3 text-left">
          {icon && <span className="text-zinc-400 group-hover:text-zinc-300">{icon}</span>}
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-zinc-500 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-white/5 bg-zinc-900/30 animate-slide-down">
          {children}
        </div>
      )}
    </div>
  );
}
