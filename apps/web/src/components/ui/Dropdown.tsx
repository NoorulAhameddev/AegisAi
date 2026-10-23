"use client";

import { ReactNode, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  isDanger?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
  triggerClassName?: string;
}

export function Dropdown({
  trigger,
  items,
  align = "left",
  className,
  triggerClassName,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-none",
          "text-ink-400 hover:text-ink-100 hover:bg-white/5",
          "transition-colors",
          triggerClassName,
        )}
      >
        {trigger}
        {typeof trigger === "string" && (
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full mt-2 z-50 min-w-48",
            "bg-ink-900 border border-ink-700",
            "animate-slide-down",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
        >
          <div className="p-1">
            {items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
                disabled={item.disabled}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-sm",
                  "transition-colors text-left",
                  item.isDanger
                    ? "text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    : "text-ink-300 hover:bg-white/10 hover:text-ink-100 disabled:opacity-50 disabled:hover:bg-transparent",
                  "disabled:cursor-not-allowed",
                )}
              >
                {item.icon && (
                  <span className="h-4 w-4 flex-shrink-0">{item.icon}</span>
                )}
                <span className="flex-1">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
