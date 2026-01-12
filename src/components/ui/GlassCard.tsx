import { cn } from "@/lib/utils";
import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradient?: "purple" | "blue" | "emerald" | "none";
  interactive?: boolean;
}

export function GlassCard({ 
  children, 
  className, 
  gradient = "none", 
  interactive = false,
  ...props 
}: GlassCardProps) {
  const gradientStyles = {
    purple: "hover:border-purple-500/30 hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.15)]",
    blue: "hover:border-blue-500/30 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.15)]",
    emerald: "hover:border-emerald-500/30 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.15)]",
    none: "hover:border-white/10"
  };

  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl p-6 transition-all duration-300",
        interactive && "cursor-pointer hover:-translate-y-1 hover:bg-zinc-800/60",
        interactive && gradientStyles[gradient],
        className
      )}
      {...props}
    >
      {/* Ambient Gradient Blob */}
      {gradient !== "none" && (
        <div className={cn(
          "pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-10",
          gradient === "purple" && "bg-purple-500",
          gradient === "blue" && "bg-blue-500",
          gradient === "emerald" && "bg-emerald-500"
        )} />
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
