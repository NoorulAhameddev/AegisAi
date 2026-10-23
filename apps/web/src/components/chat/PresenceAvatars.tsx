import React from "react";
import { Avatar } from "@/components/ui/Avatar";

interface PresenceAvatarsProps {
  users: Array<{ userId: string; userName: string; isActive: boolean }>;
}

export const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({ users }) => {
  if (!users || users.length === 0) return null;
  return (
    <div className="flex -space-x-2">
      {users.slice(0, 5).map((u, i) => (
        <Avatar
          key={u.userId}
          name={u.userName}
          size={28}
          className={
            "border " +
            (u.isActive ? "border-brand" : "border-ink-700") +
            " bg-ink-850 text-ink-100"
          }
          style={{ zIndex: 10 - i }}
        />
      ))}
      {users.length > 5 && (
        <span className="ml-2 text-xs text-ink-500">
          +{users.length - 5} more
        </span>
      )}
    </div>
  );
};
