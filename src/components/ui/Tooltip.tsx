"use client";

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  delay?: number;
  className?: string;
}

const sideClasses = {
  top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
  bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
  left: "right-full mr-2 top-1/2 -translate-y-1/2",
  right: "left-full ml-2 top-1/2 -translate-y-1/2",
};

export function Tooltip({
  content,
  children,
  side = "top",
  delay = 200,
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setVisible(true);
    }, delay);
    setTimeoutId(timeout);
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setVisible(false);
  };

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {visible && (
        <div
          className={cn(
            "absolute z-50 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap",
            "bg-zinc-900 border border-white/10 text-zinc-100 shadow-lg shadow-black/50",
            "animate-fade-in pointer-events-none",
            sideClasses[side],
            className
          )}
          role="tooltip"
        >
          {content}
          <div
            className={cn(
              "absolute w-2 h-2 bg-zinc-900 border border-white/10 transform rotate-45",
              side === "top" && "top-full -mt-1 left-1/2 -translate-x-1/2",
              side === "bottom" && "bottom-full mt-0.5 left-1/2 -translate-x-1/2",
              side === "left" && "left-full -ml-1 top-1/2 -translate-y-1/2",
              side === "right" && "right-full ml-0.5 top-1/2 -translate-y-1/2"
            )}
          />
        </div>
      )}
    </div>
  );
}
