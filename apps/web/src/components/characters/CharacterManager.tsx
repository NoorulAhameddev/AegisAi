/**
 * Character Manager Component
 * Full CRUD interface for managing AI character presets
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, Sparkles } from "lucide-react";
import { CharacterCard } from "./CharacterCard";
import { CreateCharacterModal } from "./CreateCharacterModal";
import { logger } from "@/lib/logger";
import { logger } from "@/lib/logger";

interface CharacterPreset {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  avatar?: string;
  category?: string;
  isSystem: boolean;
  isPublic: boolean;
  isActive: boolean;
  tags: string[];
  usageCount: number;
  model: string;
  temperature: number;
}

export function CharacterManager() {
  const router = useRouter();
  const [systemCharacters, setSystemCharacters] = useState<CharacterPreset[]>(
    [],
  );
  const [userCharacters, setUserCharacters] = useState<CharacterPreset[]>([]);
  const [publicCharacters, setPublicCharacters] = useState<CharacterPreset[]>(
    [],
  );
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCharacters();
  }, [searchQuery, selectedCategory]);

  const fetchCharacters = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (selectedCategory) params.set("category", selectedCategory);

      const response = await fetch(`/api/characters?${params.toString()}`);
      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || "Failed to fetch characters");
        return;
      }

      if (data?.success) {
        setSystemCharacters(data.data.system || []);
        setUserCharacters(data.data.userCreated || []);
        setPublicCharacters(data.data.public || []);
        setCategories(data.data.categories || []);
        return;
      }

      setError(data?.error || "Failed to fetch characters");
    } catch (error) {
      logger.error("Failed to load characters:", error);
      setError("Failed to fetch characters");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/characters/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete character");

      // Refresh list
      fetchCharacters();
    } catch (error) {
      logger.error("Failed to delete character:", error);
    }
  };

  const handleEdit = (id: string) => {
    logger.info(`Edit character ${id} - modal not yet implemented`);
  };

  const handleEdit = (id: string) => {
    logger.info(`Edit character ${id} - modal not yet implemented`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" />
          <span className="text-zinc-400">Loading characters...</span>
        </div>
      </div>
    );
  }

  const totalCharacters =
    systemCharacters.length + userCharacters.length + publicCharacters.length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Character Presets</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Manage AI personas for different use cases
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Character
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search characters..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="pl-10 pr-8 py-2 bg-zinc-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors appearance-none"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <div className="px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-300">
          {totalCharacters} Total
        </div>
        <div className="px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-lg text-zinc-400">
          {systemCharacters.length} System
        </div>
        <div className="px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-lg text-zinc-400">
          {userCharacters.length} Your Characters
        </div>
        <div className="px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-lg text-zinc-400">
          {publicCharacters.length} Public
        </div>
      </div>

      {/* System Characters */}
      {systemCharacters.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            System Characters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                {...character}
                canEdit={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* User Characters */}
      {userCharacters.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            Your Characters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                {...character}
                canEdit={true}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Public Characters */}
      {publicCharacters.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            Public Characters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                {...character}
                canEdit={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalCharacters === 0 && (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No characters found
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            {searchQuery || selectedCategory
              ? "Try adjusting your filters"
              : "Create your first character preset to get started"}
          </p>
          {!searchQuery && !selectedCategory && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Character
            </button>
          )}
        </div>
      )}

      {/* Create Modal */}
      <CreateCharacterModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchCharacters}
      />
    </div>
  );
}
