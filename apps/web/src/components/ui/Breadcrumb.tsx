"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      className={cn("flex items-center gap-1 text-sm", className)}
      aria-label="Breadcrumb"
    >
      <Link
        href="/"
        className="flex items-center gap-2 px-3 py-2 rounded-none text-ink-400 hover:text-ink-100 hover:bg-white/5 transition-colors"
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 text-ink-600" />
          {item.href ? (
            <Link
              href={item.href}
              className="px-3 py-2 rounded-none text-ink-400 hover:text-ink-100 hover:bg-white/5 transition-colors flex items-center gap-2"
            >
              {item.icon && <span className="h-4 w-4">{item.icon}</span>}
              <span className="truncate">{item.label}</span>
            </Link>
          ) : (
            <span className="px-3 py-2 text-ink-100 flex items-center gap-2 truncate">
              {item.icon && <span className="h-4 w-4">{item.icon}</span>}
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
