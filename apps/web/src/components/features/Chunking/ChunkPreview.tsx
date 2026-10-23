"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { X, Copy, Check } from "lucide-react";

interface Chunk {
  id: string;
  text: string;
  tokens: number;
  startToken: number;
  metadata?: Record<string, any>;
}

interface ChunkPreviewProps {
  chunks: Chunk[];
  totalTokens: number;
}

export function ChunkPreview({ chunks, totalTokens }: ChunkPreviewProps) {
  const [selectedChunk, setSelectedChunk] = useState<Chunk | null>(
    chunks[0] || null,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (chunkId: string) => {
    const chunk = chunks.find((c) => c.id === chunkId);
    if (chunk) {
      navigator.clipboard.writeText(chunk.text);
      setCopiedId(chunkId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const stats = {
    avgTokensPerChunk: Math.round(totalTokens / chunks.length),
    smallChunks: chunks.filter((c) => c.tokens < 256).length,
    largeChunks: chunks.filter((c) => c.tokens > 1024).length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <Card className="p-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-ink-500">Total Chunks</p>
            <p className="font-display text-2xl font-medium tracking-tight text-ink-100">
              {chunks.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-ink-500">Total Tokens</p>
            <p className="font-display text-2xl font-medium tracking-tight text-ink-100">
              {totalTokens.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-ink-500">Avg Tokens/Chunk</p>
            <p className="font-display text-2xl font-medium tracking-tight text-ink-100">
              {stats.avgTokensPerChunk}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Health</p>
            <div className="flex gap-1 mt-1">
              {stats.smallChunks > 0 && (
                <Badge variant="warning" className="text-xs">
                  {stats.smallChunks} small
                </Badge>
              )}
              {stats.largeChunks > 0 && (
                <Badge variant="warning" className="text-xs">
                  {stats.largeChunks} large
                </Badge>
              )}
              {stats.smallChunks === 0 && stats.largeChunks === 0 && (
                <Badge variant="success" className="text-xs">
                  Balanced
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Chunk List & Preview */}
      <div className="grid grid-cols-3 gap-4 h-96">
        {/* List */}
        <div className="col-span-1 border border-ink-700 overflow-y-auto">
          <div className="sticky top-0 bg-ink-800 border-b border-ink-700 p-3">
            <p className="text-sm font-medium text-ink-100">
              Chunks ({chunks.length})
            </p>
          </div>
          <div className="space-y-1">
            {chunks.map((chunk, idx) => (
              <button
                key={chunk.id}
                onClick={() => setSelectedChunk(chunk)}
                className={`w-full text-left px-3 py-2 text-sm border-l-2 transition ${
                  selectedChunk?.id === chunk.id
                    ? "border-brand bg-ink-800"
                    : "border-transparent hover:bg-ink-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Chunk {idx + 1}</span>
                  <Badge variant="secondary" className="text-xs">
                    {chunk.tokens}
                  </Badge>
                </div>
                <p className="text-xs text-ink-500 truncate mt-1">
                  {chunk.text.substring(0, 50)}...
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="col-span-2 border border-ink-700 overflow-hidden flex flex-col bg-ink-900">
          {selectedChunk ? (
            <>
              <div className="border-b border-ink-700 bg-ink-800 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink-100">
                    Chunk #
                    {chunks.findIndex((c) => c.id === selectedChunk.id) + 1}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <Badge>{selectedChunk.tokens} tokens</Badge>
                    <Badge variant="secondary">
                      Offset: {selectedChunk.startToken}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(selectedChunk.id)}
                  className="flex items-center gap-1 px-3 py-1 text-sm hover:bg-ink-800"
                >
                  {copiedId === selectedChunk.id ? (
                    <>
                      <Check size={14} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-sm text-ink-300 whitespace-pre-wrap">
                  {selectedChunk.text}
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-ink-500">Select a chunk to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
