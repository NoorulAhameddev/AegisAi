import { Wrench } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Under Maintenance | Aegis AI",
  description: "Aegis AI is currently undergoing scheduled maintenance.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 flex flex-col items-center justify-center gap-6 p-6 text-center relative overflow-hidden font-sans selection:bg-brand/20 selection:text-ink-100 antialiased">
      {/* Background Radial Grid */}
      <div className="fixed inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col items-center max-w-md">
        <div className="p-6 bg-ink-900 border border-ink-700 mb-2">
          <Wrench className="h-10 w-10 text-brand" />
        </div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink-100 mb-2">System Maintenance</h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-sans">
          Aegis AI is currently undergoing scheduled infrastructure upgrades. Worker queues and API endpoints will resume shortly.
        </p>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-ink-900 border border-ink-700 text-zinc-400 text-xs font-mono">
          <span className="h-1.5 w-1.5 bg-brand" />
          Status: Maintenance Mode Active
        </span>
      </div>
    </div>
  );
}
