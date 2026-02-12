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
            "border-2 " +
            (u.isActive ? "border-green-400" : "border-zinc-700") +
            " bg-zinc-900 text-white shadow-sm"
          }
          style={{ zIndex: 10 - i }}
        />
      ))}
      {users.length > 5 && (
        <span className="ml-2 text-xs text-zinc-400">
          +{users.length - 5} more
        </span>
      )}
    </div>
  );
};
