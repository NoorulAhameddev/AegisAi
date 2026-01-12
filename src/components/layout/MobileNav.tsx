"use client";

import { X, LogOut, Clock, MessageSquare, FileText, Settings } from "lucide-react";
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
        { href: "/files", label: "Files", icon: FileText },
        { href: "/settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className={cn(
            "fixed inset-0 z-50 md:hidden transition-all duration-300",
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            {/* Content */}
            <div className={cn(
                "absolute top-0 left-0 bottom-0 w-[280px] bg-zinc-900 border-r border-white/10 p-6 flex flex-col transition-transform duration-300 shadow-2xl",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-linear-to-br from-purple-600 to-blue-600 rounded-xl p-px">
                            <div className="h-full w-full bg-black rounded-[10px] flex items-center justify-center p-1">
                                <img src="/aegis-logo.png" alt="" className="h-full w-full object-contain" />
                            </div>
                        </div>
                        <span className="font-bold text-lg">Aegis AI</span>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 space-y-2">
                    {links.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={onClose}
                                className={cn(
                                    "flex items-center gap-4 px-4 py-3 rounded-xl transition-all",
                                    isActive 
                                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                                        : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <link.icon className="h-5 w-5" />
                                <span className="font-medium">{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3 p-3">
                        <div className="h-10 w-10 rounded-full bg-linear-to-tr from-purple-500 to-blue-500 p-px">
                            <div className="h-full w-full rounded-full bg-zinc-900 flex items-center justify-center text-sm font-bold">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="font-medium text-sm text-zinc-200 truncate">{user.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
