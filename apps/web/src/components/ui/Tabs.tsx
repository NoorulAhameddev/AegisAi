"use client";

import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: Array<{ label: string; value: string; icon?: React.ReactNode }>;
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn("border-b border-hair", className)}>
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors",
              "border-b-2 -mb-0.5 whitespace-nowrap",
              activeTab === tab.value
                ? "border-brand text-brand"
                : "border-transparent text-ink-500 hover:text-ink-300",
            )}
          >
            {tab.icon && <span className="h-4 w-4">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TabContentProps {
  value: string;
  activeTab: string;
  children: React.ReactNode;
}

export function TabContent({ value, activeTab, children }: TabContentProps) {
  if (value !== activeTab) return null;
  return <div className="animate-fade-in">{children}</div>;
}
