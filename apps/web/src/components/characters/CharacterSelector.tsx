/**
 * Character Selector Component
 * Dropdown for selecting AI character in chat interface
 */

"use client";

import { useState, useEffect } from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import { logger } from "@/lib/logger";
import { logger } from "@/lib/logger";

interface CharacterPreset {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  category?: string;
  isSystem: boolean;
  usageCount: number;
}

interface CharacterSelectorProps {
  selectedCharacterId?: string | null;
  onSelect: (characterId: string | null) => void;
  className?: string;
}

export function CharacterSelector({
  selectedCharacterId,
  onSelect,
  className = "",
}: CharacterSelectorProps) {
  const [characters, setCharacters] = useState<CharacterPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    try {
      const response = await fetch("/api/characters");
      if (!response.ok) throw new Error("Failed to fetch characters");

      const data = await response.json();
      if (data.success) {
        // Combine all character types
        const allCharacters = [
          ...data.data.system,
          ...data.data.userCreated,
          ...data.data.public,
        ];
        setCharacters(allCharacters);
      }
    } catch (error) {
      logger.error("Failed to load characters:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedCharacter = characters.find(
    (c) => c.id === selectedCharacterId,
  );

  const handleSelect = (characterId: string | null) => {
    onSelect(characterId);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-lg animate-pulse">
        <Sparkles className="h-4 w-4 text-purple-400" />
        <span className="text-sm text-zinc-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-lg hover:border-purple-500/30 transition-all group w-full"
      >
        <div className="flex items-center gap-2">
          {selectedCharacter?.avatar ? (
            <span className="text-lg">{selectedCharacter.avatar}</span>
          ) : (
            <Sparkles className="h-4 w-4 text-purple-400" />
          )}
          <span className="text-sm text-white">
            {selectedCharacter?.name || "Default Assistant"}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-zinc-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-20 max-h-96 overflow-y-auto">
            {/* Default option */}
            <button
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-500/10 transition-colors text-left ${
                !selectedCharacterId ? "bg-purple-500/20" : ""
              }`}
            >
              <Sparkles className="h-5 w-5 text-purple-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">
                  Default Assistant
                </div>
                <div className="text-xs text-zinc-400 truncate">
                  Standard AI tutor
                </div>
              </div>
            </button>

            {/* Character list */}
            {characters.map((character) => (
              <button
                key={character.id}
                onClick={() => handleSelect(character.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-500/10 transition-colors text-left border-t border-white/5 ${
                  selectedCharacterId === character.id ? "bg-purple-500/20" : ""
                }`}
              >
                {character.avatar ? (
                  <span className="text-xl shrink-0">{character.avatar}</span>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">
                      {character.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {character.name}
                    </span>
                    {character.isSystem && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-300 rounded">
                        SYSTEM
                      </span>
                    )}
                  </div>
                  {character.description && (
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {character.description}
                    </p>
                  )}
                  {character.category && (
                    <span className="text-[10px] text-zinc-500 mt-1 inline-block">
                      {character.category}
                    </span>
                  )}
                </div>
              </button>
            ))}

            {characters.length === 0 && (
              <div className="px-4 py-8 text-center text-zinc-400 text-sm">
                No characters available. Create your first one!
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
