"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  PanelLeft,
  Database,
  MoreVertical,
  Pin,
  PinOff,
  BookOpen,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

interface AppSidebarProps {
  user: {
    name: string;
    email: string;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pinnedItems, setPinnedItems] = useState<string[]>([]);

  // Handle Resize
  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };

    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  const links = [
    { href: "/dashboard", label: "Overview", icon: Clock },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/characters", label: "Characters", icon: Users },
    { href: "/files", label: "Files", icon: FileText },
    { href: "/knowledge", label: "Knowledge Base", icon: Database },
    { href: "/study", label: "Study", icon: BookOpen },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  if (isMobile) return null;

  const togglePin = (href: string) => {
    setPinnedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    );
  };

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 border-r border-hair bg-ink-950 flex flex-col transition-all duration-300 ease-in-out z-50",
        collapsed ? "w-20" : "w-72",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center h-20 px-6",
          collapsed ? "justify-center px-0" : "justify-between",
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden bg-ink-850 border border-ink-700 p-1 group-hover:border-brand/50 transition-colors">
              <img
                src="/aegis-logo.png"
                alt="Aegis AI Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <span
              className={cn(
                "font-display font-medium text-xl tracking-tight text-ink-100 whitespace-nowrap transition-all duration-300 group-hover:text-brand",
                collapsed ? "opacity-0 w-0" : "opacity-100 w-auto",
              )}
            >
              Aegis AI
            </span>
          </Link>
        </div>

        {!collapsed && (
          <Tooltip content="Collapse sidebar" side="right">
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 text-ink-500 hover:text-ink-100 hover:bg-white/5 transition-colors active:scale-95"
              aria-label="Collapse Sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </Tooltip>
        )}
      </div>

      {/* Toggle Button (When Collapsed) */}
      {collapsed && (
        <div className="flex justify-center mb-4">
          <Tooltip content="Expand sidebar" side="right">
            <button
              onClick={() => setCollapsed(false)}
              className="p-1.5 text-ink-500 hover:text-ink-100 hover:bg-white/5 transition-colors active:scale-95"
              aria-label="Expand Sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto scrollbar-hide">
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);
          const isPinned = pinnedItems.includes(link.href);

          return (
            <div key={link.href} className="group/nav">
              <Link
                href={link.href}
                className={cn(
                  "flex items-center transition-colors duration-200 relative",
                  collapsed ? "justify-center p-3" : "px-4 py-3 gap-3",
                  isActive
                    ? "bg-white/5 text-brand font-medium border-l-2 border-l-brand"
                    : "text-ink-400 hover:text-ink-100 hover:bg-white/5 border-l-2 border-l-transparent",
                )}
                title={collapsed ? link.label : undefined}
              >
                <link.icon
                  className={cn(
                    "shrink-0 transition-colors",
                    collapsed ? "h-6 w-6" : "h-5 w-5",
                    isActive
                      ? "text-brand"
                      : "text-ink-500 group-hover/nav:text-ink-300",
                  )}
                />

                {!collapsed && (
                  <span className="font-medium whitespace-nowrap overflow-hidden transition-all text-sm">
                    {link.label}
                  </span>
                )}

                {isActive && !collapsed && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />
                )}

                {!collapsed && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      togglePin(link.href);
                    }}
                    className="ml-auto opacity-0 group-hover/nav:opacity-100 p-1 text-ink-600 hover:text-ink-400 hover:bg-white/5 transition-colors active:scale-90"
                    aria-label={isPinned ? "Unpin" : "Pin"}
                  >
                    {isPinned ? (
                      <Pin className="h-3.5 w-3.5" />
                    ) : (
                      <PinOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className={cn(
          "p-4 border-t border-hair group/footer",
          collapsed && "flex justify-center",
        )}
      >
        <Tooltip content={user.email} side="right" delay={500}>
          <div
            className={cn(
              "flex items-center hover:bg-white/5 transition-colors cursor-pointer",
              collapsed
                ? "p-0 justify-center h-10 w-10 overflow-hidden"
                : "p-3 gap-3",
            )}
          >
            <div className="relative h-9 w-9 shrink-0 rounded-full bg-ink-800 border border-ink-700 flex items-center justify-center font-medium text-ink-100 text-xs">
              {user.name.charAt(0).toUpperCase()}
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-ink-950" />
            </div>

            {!collapsed && (
              <>
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium text-sm text-ink-200 truncate group-hover/user:text-ink-100 transition-colors">
                    {user.name}
                  </p>
                  <p className="text-xs text-ink-500 font-mono truncate">{user.email}</p>
                </div>
                <LogOut className="h-4 w-4 text-ink-600 group-hover/user:text-ink-400 transition-colors active:scale-95" />
              </>
            )}
          </div>
        </Tooltip>
      </div>
    </aside>
  );
}
