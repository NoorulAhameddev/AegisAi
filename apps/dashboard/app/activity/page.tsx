"use client";
import React, { useState, useEffect } from "react";

interface ActivityEvent {
  id: string;
  type: string;
  action: string;
  timestamp: string;
  user?: string;
  details?: string;
}

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch("/api/activity");
        if (res.ok) {
          const data = await res.json();
          setEvents(data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
    const interval = setInterval(fetchActivity, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="opacity-0 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Activity</h1>
        <p className="text-zinc-500">
          Recent security events and system activity
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div
          className="absolute left-[11px] top-6 bottom-6 w-0.5"
          style={{ backgroundColor: "var(--color-border)" }}
        />

        <div className="space-y-4">
          {loading ? (
            <div
              className="rounded-xl border p-6"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="skeleton h-24 w-full" />
            </div>
          ) : events.length === 0 ? (
            <div
              className="rounded-xl border p-8 text-center ml-8 opacity-0 animate-fade-in-up"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                borderColor: "var(--color-border)",
                animationDelay: "75ms",
              }}
            >
              <p className="text-zinc-500">No activity recorded yet</p>
            </div>
          ) : (
            events.map((event, i) => (
              <ActivityEvent key={event.id} event={event} delay={75 + i * 50} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityEvent({
  event,
  delay,
}: {
  event: ActivityEvent;
  delay: number;
}) {
  const typeColors: Record<string, { color: string; bg: string }> = {
    security: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
    scan: { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
    task: { color: "#eab308", bg: "rgba(234, 179, 8, 0.1)" },
    job: { color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" },
  };

  const dotColor = typeColors[event.type]?.color || "#71717a";

  return (
    <div
      className="relative flex items-start gap-6 pl-0 opacity-0 animate-slide-in-left"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative z-10 mt-1">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: dotColor,
            boxShadow: `0 0 0 4px var(--color-bg-primary)`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "var(--color-bg-primary)" }}
          />
        </div>
      </div>

      <div
        className="flex-1 rounded-xl border p-4 card-hover"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-medium text-sm text-zinc-200 mb-1">
              {event.action}
            </h4>
            {event.details && (
              <p className="text-xs text-zinc-500">{event.details}</p>
            )}
          </div>
          <span
            style={{
              backgroundColor:
                typeColors[event.type]?.bg || "rgba(113, 113, 122, 0.1)",
              color: typeColors[event.type]?.color || "#71717a",
            }}
            className="px-2 py-1 rounded-md text-xs font-medium capitalize"
          >
            {event.type}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-600">
          <span>{new Date(event.timestamp).toLocaleString()}</span>
          {event.user && <span>by {event.user}</span>}
        </div>
      </div>
    </div>
  );
}
