"use client";
import React, { useEffect, useState, useMemo } from "react";

interface ActivityItem {
  timestamp: number;
  kind?: string;
  type?: string;
  jobId?: string;
  taskId?: string;
  [key: string]: any;
}

const TypeColors: Record<string, string> = {
  "job-created": "bg-blue-900/20 border-blue-700 text-blue-300",
  "job-started": "bg-purple-900/20 border-purple-700 text-purple-300",
  "job-completed": "bg-green-900/20 border-green-700 text-green-300",
  "job-failed": "bg-red-900/20 border-red-700 text-red-300",
  "task-created": "bg-cyan-900/20 border-cyan-700 text-cyan-300",
  "task-updated": "bg-cyan-900/20 border-cyan-700 text-cyan-300",
  "task-deleted": "bg-red-900/20 border-red-700 text-red-300",
  "scan-started": "bg-yellow-900/20 border-yellow-700 text-yellow-300",
  "scan-completed": "bg-green-900/20 border-green-700 text-green-300",
};

const TypeBadges: Record<string, string> = {
  "job-created": "bg-blue-900 text-blue-200",
  "job-started": "bg-purple-900 text-purple-200",
  "job-completed": "bg-green-900 text-green-200",
  "job-failed": "bg-red-900 text-red-200",
  "task-created": "bg-cyan-900 text-cyan-200",
  "task-updated": "bg-cyan-900 text-cyan-200",
  "task-deleted": "bg-red-900 text-red-200",
  "scan-started": "bg-yellow-900 text-yellow-200",
  "scan-completed": "bg-green-900 text-green-200",
};

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchItems() {
    try {
      const res = await fetch("/api/activity");
      const data = await res.json();
      setItems(Array.isArray(data) ? data.reverse() : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    items.forEach((it) => {
      const key = it.kind || it.type || "other";
      types.add(key);
    });
    return Array.from(types).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((it) => (it.kind || it.type || "other") === filter);
  }, [items, filter]);

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Activity Log</h1>
          <p className="text-slate-400">{items.length} events recorded</p>
        </div>
        <button
          onClick={fetchItems}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition"
        >
          Refresh
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded font-medium transition ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          All Events
        </button>
        {eventTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded font-medium transition ${
              filter === type
                ? "bg-blue-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Activity Timeline */}
      {loading ? (
        <div className="text-slate-400">Loading activity...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center text-slate-400">
          <p>No activity found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((it, i) => {
            const type = it.kind || it.type || "other";
            const colorClass = TypeColors[type] || "bg-slate-700";
            const badgeClass = TypeBadges[type];
            const time = new Date(it.timestamp || 0);
            const now = new Date();
            const isToday = time.toDateString() === now.toDateString();
            const isYesterday =
              time.toDateString() ===
              new Date(now.getTime() - 86400000).toDateString();

            return (
              <div key={i} className={`border rounded-lg p-4 ${colorClass}`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded ${badgeClass}`}
                      >
                        {type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {isToday
                          ? time.toLocaleTimeString()
                          : isYesterday
                            ? "Yesterday " + time.toLocaleTimeString()
                            : time.toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      {it.jobId && (
                        <div className="text-slate-300">
                          Job: <span className="font-mono">{it.jobId}</span>
                        </div>
                      )}
                      {it.taskId && (
                        <div className="text-slate-300">
                          Task: <span className="font-mono">{it.taskId}</span>
                        </div>
                      )}
                      {Object.entries(it).map(
                        ([k, v]) =>
                          ![
                            "timestamp",
                            "kind",
                            "type",
                            "jobId",
                            "taskId",
                          ].includes(k) &&
                          typeof v === "string" && (
                            <div key={k} className="text-slate-400">
                              <span className="opacity-75">{k}:</span> {v}
                            </div>
                          ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
