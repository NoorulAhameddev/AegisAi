"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { MobileNav } from "./MobileNav";

interface DashboardHeaderProps {
  user: { name: string; email: string };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <header className="md:hidden flex items-center justify-between px-6 h-16 border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-linear-to-br from-purple-600 to-blue-600 rounded-lg p-px">
            <div className="h-full w-full bg-black rounded-[7px] flex items-center justify-center p-1">
              <img src="/aegis-logo.png" alt="" className="h-full w-full object-contain" />
            </div>
          </div>
          <span className="font-bold text-lg">Aegis AI</span>
        </div>
        
        <button 
          onClick={() => setMobileNavOpen(true)}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      <MobileNav user={user} isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
