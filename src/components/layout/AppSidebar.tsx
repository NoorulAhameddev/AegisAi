"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, MessageSquare, FileText, Settings, LogOut, ChevronRight, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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
    { href: "/files", label: "Files", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  if (isMobile) return null; 

  return (
    <aside 
      className={cn(
        "h-screen sticky top-0 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out z-50",
        collapsed ? "w-20" : "w-72"
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center h-20 px-6", collapsed ? "justify-center px-0" : "justify-between")}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-linear-to-br from-purple-600 to-blue-600 p-px">
            <div className="h-full w-full rounded-xl bg-black flex items-center justify-center">
               <img src="/aegis-logo.png" alt="Logo" className="h-6 w-6 object-contain" />
            </div>
          </div>
          <span 
            className={cn(
               "font-bold text-xl tracking-tight text-white whitespace-nowrap transition-all duration-300",
               collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
            )}
          >
            Aegis AI
          </span>
        </div>
        
        {!collapsed && (
          <button 
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Collapse Sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Toggle Button (When Collapsed) */}
      {collapsed && (
          <div className="flex justify-center mb-4">
             <button 
                onClick={() => setCollapsed(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Expand Sidebar"
             >
                <ChevronRight className="h-4 w-4" />
             </button>
          </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-3">
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group flex items-center rounded-xl transition-all duration-200 relative",
                collapsed ? "justify-center p-3" : "px-4 py-3 gap-3",
                isActive 
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
              )}
              title={collapsed ? link.label : undefined}
            >
              <link.icon className={cn(
                "shrink-0 transition-colors",
                collapsed ? "h-6 w-6" : "h-5 w-5",
                isActive ? "text-purple-400" : "text-zinc-500 group-hover:text-zinc-300"
              )} />
              
              {!collapsed && (
                 <span className="font-medium whitespace-nowrap overflow-hidden transition-all">
                    {link.label}
                 </span>
              )}
              
              {isActive && !collapsed && (
                <div className="ml-auto h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
              )}

              {/* Tooltip for collapsed mode */}
              {collapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-zinc-900 border border-white/10 rounded-md text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {link.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn("p-4 border-t border-white/5", collapsed && "flex justify-center")}>
        <div className={cn(
           "group flex items-center rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5",
           collapsed ? "p-0 justify-center h-10 w-10 overflow-hidden" : "p-3 gap-3"
        )}>
          <div className="relative h-9 w-9 shrink-0 rounded-full bg-linear-to-tr from-purple-500 to-blue-500 p-px">
            <div className="h-full w-full rounded-full bg-zinc-900 flex items-center justify-center text-sm font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-black" />
          </div>

          {!collapsed && (
             <>
                <div className="flex-1 overflow-hidden">
                    <p className="font-medium text-sm text-zinc-200 truncate group-hover:text-white transition-colors">{user.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                </div>
                <LogOut className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
             </>
          )}
        </div>
      </div>
    </aside>
  );
}
