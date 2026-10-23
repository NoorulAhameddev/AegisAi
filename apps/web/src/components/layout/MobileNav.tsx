"use client";

import {
  X,
  LogOut,
  Clock,
  MessageSquare,
  FileText,
  Settings,
  Database,
  BookOpen,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  user: { name: string; email: string };
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ user, isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Overview", icon: Clock },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/characters", label: "Characters", icon: Users },
    { href: "/files", label: "Files", icon: FileText },
    { href: "/knowledge", label: "Knowledge Base", icon: Database },
    { href: "/study", label: "Study", icon: BookOpen },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 md:hidden transition-all duration-300",
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none",
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={cn(
          "absolute top-0 left-0 bottom-0 w-[280px] bg-ink-900 border-r border-hair p-6 flex flex-col transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-ink-850 border border-ink-700 p-1 flex items-center justify-center">
              <img
                src="/aegis-logo.png"
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <span className="font-display font-medium text-lg tracking-tight">Aegis AI</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-ink-500 hover:text-ink-100"
            title="Close menu"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 border-l-2 transition-colors",
                  isActive
                    ? "bg-white/5 text-brand border-l-brand"
                    : "text-ink-400 hover:text-ink-100 hover:bg-white/5 border-l-transparent",
                )}
              >
                <link.icon className="h-5 w-5" />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-hair">
          <div className="flex items-center gap-3 p-3">
            <div className="h-10 w-10 rounded-full bg-ink-800 border border-ink-700 flex items-center justify-center text-sm font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-medium text-sm text-ink-200 truncate">
                {user.name}
              </p>
              <p className="text-xs text-ink-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
