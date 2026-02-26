/**
 * Create Character Modal
 * Modal for creating new character presets
 */

"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface CreateCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCharacterModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCharacterModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [category, setCategory] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          avatar: avatar || undefined,
          systemPrompt,
          category: category || undefined,
          temperature,
          model,
          tags: tags
            ? tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          isPublic,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create character");
      }

      // Reset form
      setName("");
      setDescription("");
      setAvatar("");
      setSystemPrompt("");
      setCategory("");
      setTemperature(0.7);
      setModel("openai/gpt-4o-mini");
      setTags("");
      setIsPublic(false);

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create character",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-white/10 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-white">
            Create Character Preset
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Character Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Python Expert, Creative Writer"
              required
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this character"
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Avatar (emoji)
            </label>
            <input
              type="text"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="🎓 (emoji character)"
              maxLength={4}
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              System Prompt <span className="text-red-400">*</span>
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant that..."
              required
              rows={8}
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors resize-none font-mono text-sm"
            />
            <p className="mt-1 text-xs text-zinc-500">
              This defines how the AI will behave. Be specific about tone,
              style, and constraints.
            </p>
          </div>

          {/* Category & Tags */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">Select category</option>
                <option value="Education">Education</option>
                <option value="Coding">Coding</option>
                <option value="Creative">Creative</option>
                <option value="Business">Business</option>
                <option value="Science">Science</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="coding, python, debug"
                className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          {/* Model & Temperature */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                <option value="openai/gpt-4o">GPT-4o</option>
                <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Temperature: {temperature.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-1">
                <span>Focused</span>
                <span>Creative</span>
              </div>
            </div>
          </div>

          {/* Public toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-white/10 bg-zinc-800 text-purple-500 focus:ring-purple-500"
            />
            <label htmlFor="isPublic" className="text-sm text-white">
              Make this character public (other users can use it)
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name || !systemPrompt}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Character"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
