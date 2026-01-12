"use client";

import { cn } from "@/lib/utils";

interface ActivityChartProps {
    data: { day: string; count: number }[];
    className?: string;
}

export function ActivityChart({ data, className }: ActivityChartProps) {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    
    return (
        <div className={cn("relative h-64 w-full flex items-end justify-between gap-2 px-2", className)}>
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-full border-t border-white/5" />
                ))}
            </div>

            {/* Bars */}
            {data.map((item, i) => {
                const heightPercentage = (item.count / maxCount) * 100;
                return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        {/* Tooltip */}
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black text-[10px] font-bold px-2 py-1 rounded shadow-xl pointer-events-none z-10 whitespace-nowrap">
                            {item.count} messages
                            <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-white" />
                        </div>

                        {/* Bar */}
                        <div 
                            className="w-full max-w-[40px] rounded-t-lg bg-linear-to-t from-purple-500/20 to-purple-500 group-hover:to-purple-400 transition-all duration-500 animate-grow-height origin-bottom"
                            style={{ 
                                height: `${Math.max(heightPercentage, 5)}%`,
                                animationDelay: `${i * 50}ms`
                            }}
                        />
                        
                        {/* Label */}
                        <span className="text-[10px] text-zinc-600 mt-4 font-medium uppercase tracking-tighter">
                            {item.day}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
