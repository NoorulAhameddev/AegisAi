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
      className="group relative bg-ink-850 border border-hair p-4 hover:border-brand/40 transition-colors cursor-pointer"
      onClick={() => onSelect?.(id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {avatar ? (
            <span className="text-3xl shrink-0">{avatar}</span>
          ) : (
            <div className="h-12 w-12 bg-ink-800 border border-hair flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6 text-ink-100" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-ink-100 font-medium truncate">{name}</h3>
            {category && (
              <span className="text-xs text-ink-400">{category}</span>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col gap-1 items-end">
          {isSystem && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-brand/15 text-brand">
              SYSTEM
            </span>
          )}
          {isPublic && !isSystem && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-ink-800 text-ink-400">
              PUBLIC
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-ink-400 mb-3 line-clamp-2">{description}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-ink-800 text-ink-300"
            >
              #{tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-ink-500">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-ink-500 mb-3 pb-3 border-b border-hair">
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
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-hair text-ink-100 hover:bg-ink-800 text-sm transition-colors"
            >
              <Edit2 className="h-3 w-3" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Replace with a confirmation modal
                onDelete(id);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm transition-colors"
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
