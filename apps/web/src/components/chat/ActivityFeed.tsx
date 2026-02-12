import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ActivityEvent {
  action: string;
  userName: string;
  userEmail?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface ActivityFeedProps {
  chatId: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ chatId }) => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/collaboration/${chatId}/activity?limit=50`)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.activities || []);
      })
      .catch((err) => setError("Failed to load activity feed"))
      .finally(() => setLoading(false));
  }, [chatId]);

  if (loading)
    return (
      <div className="flex items-center gap-2 text-zinc-400">
        <Loader2 className="animate-spin h-4 w-4" /> Loading activity...
      </div>
    );
  if (error) return <div className="text-red-500 text-sm">{error}</div>;
  if (!events.length)
    return <div className="text-zinc-400 text-sm">No activity yet.</div>;

  return (
    <div className="space-y-3">
      {events.map((ev, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="font-bold text-zinc-200">{ev.userName}</span>
          <span className="text-zinc-400">{ev.action.replace(/_/g, " ")}</span>
          <span className="text-xs text-zinc-500 ml-auto">
            {new Date(ev.createdAt).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};
