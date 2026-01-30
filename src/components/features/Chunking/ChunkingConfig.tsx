"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Slider } from "@/components/ui/Slider";
import { AlertCircle, Info } from "lucide-react";

interface ChunkingSettings {
  chunkSize: number;
  overlapSize: number;
  chunkingStrategy: "fixed" | "recursive" | "semantic";
  preserveStructure: boolean;
}

interface ChunkingConfigProps {
  settings: ChunkingSettings;
  onChange: (settings: ChunkingSettings) => void;
  documentTokens?: number;
}

export function ChunkingConfig({
  settings,
  onChange,
  documentTokens = 0,
}: ChunkingConfigProps) {
  const estimatedChunks = Math.ceil(documentTokens / settings.chunkSize);
  const overlapPercentage = (settings.overlapSize / settings.chunkSize) * 100;

  const handleStrategyChange = (
    strategy: "fixed" | "recursive" | "semantic",
  ) => {
    onChange({ ...settings, chunkingStrategy: strategy });
  };

  const handleChunkSizeChange = (size: number) => {
    const newOverlap = Math.min(settings.overlapSize, Math.floor(size * 0.2));
    onChange({ ...settings, chunkSize: size, overlapSize: newOverlap });
  };

  const handleOverlapChange = (overlap: number) => {
    onChange({ ...settings, overlapSize: overlap });
  };

  return (
    <div className="space-y-6">
      {/* Strategy Selection */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Chunking Strategy</h3>
        <div className="grid grid-cols-3 gap-2">
          {(["fixed", "recursive", "semantic"] as const).map((strategy) => (
            <button
              key={strategy}
              onClick={() => handleStrategyChange(strategy)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                settings.chunkingStrategy === strategy
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                {strategy === "fixed" && "📏"}
                {strategy === "recursive" && "🔀"}
                {strategy === "semantic" && "🧠"}
                <span className="capitalize">{strategy}</span>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {settings.chunkingStrategy === "fixed" &&
            "Equal-sized chunks, fastest processing"}
          {settings.chunkingStrategy === "recursive" &&
            "Semantically aware, respects structure"}
          {settings.chunkingStrategy === "semantic" &&
            "AI-powered, best for RAG but slower"}
        </p>
      </Card>

      {/* Chunk Size */}
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 font-semibold text-sm mb-2">
              Chunk Size (tokens)
              <Badge variant="secondary">{settings.chunkSize}</Badge>
            </label>
            <Slider
              value={[settings.chunkSize]}
              onValueChange={(value) => handleChunkSizeChange(value[0])}
              min={256}
              max={2048}
              step={256}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>256</span>
              <span>2048</span>
            </div>
          </div>

          {documentTokens > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                📊 Document will be split into ~
                <strong>{estimatedChunks}</strong> chunks
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Overlap */}
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 font-semibold text-sm mb-2">
              Overlap (tokens)
              <Badge variant="secondary">{settings.overlapSize}</Badge>
              <span className="text-gray-500 font-normal">
                ({overlapPercentage.toFixed(0)}%)
              </span>
            </label>
            <Slider
              value={settings.overlapSize}
              onChange={handleOverlapChange}
              min={0}
              max={Math.floor(settings.chunkSize * 0.5)}
              step={16}
              className="w-full"
            />
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-600">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              Overlap helps maintain context between chunks. Recommended: 10-20%
            </span>
          </div>
        </div>
      </Card>

      {/* Options */}
      <Card className="p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.preserveStructure}
            onChange={(e) =>
              onChange({ ...settings, preserveStructure: e.target.checked })
            }
            className="w-4 h-4"
          />
          <div>
            <p className="font-medium text-sm">Preserve Structure</p>
            <p className="text-xs text-gray-500">
              Respect markdown headers, code blocks, etc.
            </p>
          </div>
        </label>
      </Card>
    </div>
  );
}
