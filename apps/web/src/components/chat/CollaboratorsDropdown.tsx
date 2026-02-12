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
        <button className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-900 text-zinc-200 hover:bg-zinc-800 transition-all">
          <Users className="h-5 w-5" />
          <span className="font-medium text-sm">
            {collaborators.length} Collaborators
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-zinc-500 uppercase">
            Collaborators
          </span>
          {onInvite && (
            <button
              onClick={onInvite}
              className="text-xs text-purple-500 hover:underline flex items-center gap-1"
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
                  c.isActive ? "ring-2 ring-green-400" : "ring-1 ring-zinc-700"
                }
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-zinc-200">
                  {c.userName}
                </span>
                <span className="text-xs text-zinc-400">{c.role}</span>
              </div>
              {c.isActive && (
                <span className="ml-auto text-xs text-green-400">Active</span>
              )}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
};
