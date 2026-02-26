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
        "h-screen sticky top-0 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out z-50",
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
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-linear-to-br from-purple-600 to-blue-600 p-px group cursor-pointer hover:scale-110 transition-transform">
            <div className="h-full w-full rounded-xl bg-black flex items-center justify-center group-hover:shadow-[inset_0_0_10px_rgba(168,85,247,0.4)] transition-all">
              <img
                src="/aegis-logo.png"
                alt="Logo"
                className="h-6 w-6 object-contain"
              />
            </div>
          </div>
          <span
            className={cn(
              "font-bold text-xl tracking-tight whitespace-nowrap transition-all duration-300 bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent",
              collapsed ? "opacity-0 w-0" : "opacity-100 w-auto",
            )}
          >
            Aegis AI
          </span>
        </div>

        {!collapsed && (
          <Tooltip content="Collapse sidebar" side="right">
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all hover:scale-110 active:scale-95"
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
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all hover:scale-110 active:scale-95"
              aria-label="Expand Sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-3 overflow-y-auto scrollbar-hide">
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);
          const isPinned = pinnedItems.includes(link.href);

          return (
            <div key={link.href} className="group/nav">
              <Link
                href={link.href}
                className={cn(
                  "flex items-center rounded-xl transition-all duration-200 relative",
                  collapsed ? "justify-center p-3" : "px-4 py-3 gap-3",
                  isActive
                    ? "bg-linear-to-r from-purple-500/10 to-blue-500/10 text-purple-400 border border-purple-500/20 shadow-[inset_0_0_10px_rgba(168,85,247,0.1)]"
                    : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10",
                )}
                title={collapsed ? link.label : undefined}
              >
                <link.icon
                  className={cn(
                    "shrink-0 transition-all",
                    collapsed ? "h-6 w-6" : "h-5 w-5",
                    isActive
                      ? "text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                      : "text-zinc-500 group-hover/nav:text-zinc-300",
                  )}
                />

                {!collapsed && (
                  <span className="font-medium whitespace-nowrap overflow-hidden transition-all">
                    {link.label}
                  </span>
                )}

                {isActive && !collapsed && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] animate-pulse-subtle" />
                )}

                {!collapsed && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      togglePin(link.href);
                    }}
                    className="ml-auto opacity-0 group-hover/nav:opacity-100 p-1 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-white/10 transition-all active:scale-90"
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
          "p-4 border-t border-white/5 group/footer",
          collapsed && "flex justify-center",
        )}
      >
        <Tooltip content={user.email} side="right" delay={500}>
          <div
            className={cn(
              "flex items-center rounded-xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5 group/user",
              collapsed
                ? "p-0 justify-center h-10 w-10 overflow-hidden"
                : "p-3 gap-3",
            )}
          >
            <div className="relative h-9 w-9 shrink-0 rounded-full bg-linear-to-tr from-purple-500 to-blue-500 p-px group-hover/user:shadow-[0_0_12px_rgba(168,85,247,0.4)] transition-all">
              <div className="h-full w-full rounded-full bg-zinc-900 flex items-center justify-center text-sm font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-black animate-pulse-subtle" />
            </div>

            {!collapsed && (
              <>
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium text-sm text-zinc-200 truncate group-hover/user:text-white transition-colors">
                    {user.name}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                </div>
                <LogOut className="h-4 w-4 text-zinc-600 group-hover/user:text-zinc-400 transition-all group-hover/user:scale-110 active:scale-95" />
              </>
            )}
          </div>
        </Tooltip>
      </div>
    </aside>
  );
}
