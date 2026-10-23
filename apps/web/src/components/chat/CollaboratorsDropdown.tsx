import React from "react";
import { Avatar } from "@/components/ui/Avatar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/Popover";
import { UserPlus, Users } from "lucide-react";

export interface Collaborator {
  userId: string;
  userName: string;
  role: string;
  isActive: boolean;
}

interface CollaboratorsDropdownProps {
  collaborators: Collaborator[];
  onInvite?: () => void;
}

export const CollaboratorsDropdown: React.FC<CollaboratorsDropdownProps> = ({
  collaborators,
  onInvite,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1 bg-ink-800 text-ink-200 hover:bg-ink-700 transition-colors">
          <Users className="h-5 w-5" />
          <span className="font-medium text-sm">
            {collaborators.length} Collaborators
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="eyebrow text-ink-500">
            Collaborators
          </span>
          {onInvite && (
            <button
              onClick={onInvite}
              className="text-xs text-brand hover:underline flex items-center gap-1"
            >
              <UserPlus className="h-4 w-4" /> Invite
            </button>
          )}
        </div>
        <ul className="space-y-2">
          {collaborators.map((c, i) => (
            <li key={c.userId} className="flex items-center gap-3">
              <Avatar
                name={c.userName}
                size={28}
                className={
                  c.isActive ? "ring-1 ring-brand" : "ring-1 ring-ink-700"
                }
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-ink-100">
                  {c.userName}
                </span>
                <span className="text-xs text-ink-500">{c.role}</span>
              </div>
              {c.isActive && (
                <span className="ml-auto text-xs text-ink-400">Active</span>
              )}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
};
