/**
 * Character Card Component
 * Display character information in a card format
 */

"use client";

import { Sparkles, TrendingUp, Edit2, Trash2 } from "lucide-react";

interface CharacterCardProps {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  category?: string;
  isSystem: boolean;
  isPublic: boolean;
  usageCount: number;
  tags?: string[];
  model: string;
  temperature: number;
  canEdit?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSelect?: (id: string) => void;
}

export function CharacterCard({
  id,
  name,
  description,
  avatar,
  category,
  isSystem,
  isPublic,
  usageCount,
  tags = [],
  model,
  temperature,
  canEdit = false,
  onEdit,
  onDelete,
  onSelect,
}: CharacterCardProps) {
  return (
    <div
      className="group relative bg-zinc-900/50 border border-white/10 rounded-lg p-4 hover:border-purple-500/30 transition-all cursor-pointer"
      onClick={() => onSelect?.(id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {avatar ? (
            <span className="text-3xl shrink-0">{avatar}</span>
          ) : (
            <div className="h-12 w-12 rounded-xl bg-linear-to-br from-purple-500 to-purple-700 flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">{name}</h3>
            {category && (
              <span className="text-xs text-zinc-400">{category}</span>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col gap-1 items-end">
          {isSystem && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-300 rounded">
              SYSTEM
            </span>
          )}
          {isPublic && !isSystem && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-300 rounded">
              PUBLIC
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{description}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-300 rounded"
            >
              #{tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-zinc-500">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-zinc-500 mb-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>{usageCount.toLocaleString()} uses</span>
          </div>
          <span>Temp: {temperature}</span>
        </div>
        <span className="text-[10px]">{model.replace("openai/", "")}</span>
      </div>

      {/* Actions */}
      {canEdit && (onEdit || onDelete) && (
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(id);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded text-sm transition-colors"
            >
              <Edit2 className="h-3 w-3" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (
                  confirm(
                    "Are you sure you want to delete this character? Chats using it will revert to default.",
                  )
                ) {
                  onDelete(id);
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded text-sm transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
