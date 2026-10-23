"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Search, BookOpen, Filter, Clock } from "lucide-react";

interface RAGDocument {
  id: string;
  name: string;
  uploadedAt: string;
  chunks: number;
  tokens: number;
  language?: string;
  selected: boolean;
}

interface RAGContextProps {
  documents: RAGDocument[];
  onSelectDocuments: (documentIds: string[]) => void;
  onSearch: (query: string) => Promise<any>;
  searchResults?: any[];
  loading?: boolean;
}

export function RAGContext({
  documents,
  onSelectDocuments,
  onSearch,
  searchResults = [],
  loading = false,
}: RAGContextProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>(
    documents.map((d) => d.id),
  );
  const [showFilters, setShowFilters] = useState(false);

  const handleSelectDocument = (docId: string) => {
    const updated = selectedDocs.includes(docId)
      ? selectedDocs.filter((d) => d !== docId)
      : [...selectedDocs, docId];
    setSelectedDocs(updated);
    onSelectDocuments(updated);
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await onSearch(searchQuery);
    }
  };

  const totalTokens = documents
    .filter((d) => selectedDocs.includes(d.id))
    .reduce((sum, d) => sum + d.tokens, 0);

  return (
    <div className="space-y-4">
      {/* Search Box */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-2.5 text-gray-400"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search across selected documents..."
              className="pl-10"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="bg-brand text-ink-950 hover:bg-brand-dim disabled:bg-ink-700 font-mono text-[0.7rem] uppercase tracking-[0.12em] py-2 px-6 transition"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {/* Context Info */}
      <Card className="p-4 bg-ink-850 border-hair">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink-100">RAG Context</p>
            <p className="text-xs text-ink-300 mt-1">
              {selectedDocs.length} documents • {totalTokens.toLocaleString()}{" "}
              tokens
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 px-3 py-1 text-sm text-brand hover:text-brand-dim font-medium"
          >
            <Filter size={16} />
            Filters
          </button>
        </div>
      </Card>

      {/* Document List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {documents.map((doc) => (
          <Card
            key={doc.id}
            className={`p-3 cursor-pointer transition ${
              selectedDocs.includes(doc.id)
                ? "border-brand bg-ink-800"
                : "border-ink-700 hover:border-ink-500"
            }`}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDocs.includes(doc.id)}
                onChange={() => handleSelectDocument(doc.id)}
                className="mt-1 w-4 h-4"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-ink-100 truncate">
                  {doc.name}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {doc.chunks} chunks
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {(doc.tokens / 1000).toFixed(1)}K tokens
                  </Badge>
                  {doc.language && (
                    <Badge variant="secondary" className="text-xs">
                      {doc.language}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-ink-500 mt-2">
                  <Clock size={12} />
                  {doc.uploadedAt}
                </div>
              </div>
            </label>
          </Card>
        ))}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card className="p-4">
          <p className="font-semibold text-sm mb-3">
            Search Results ({searchResults.length})
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((result, idx) => (
              <div key={idx} className="p-3 bg-ink-900 border border-hair">
                <p className="text-xs font-medium text-ink-400 mb-1">
                  From: {result.source}
                </p>
                <p className="text-sm text-ink-300">{result.text}</p>
                {result.relevance && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-ink-800 overflow-hidden">
                      <div
                        className="h-full bg-brand"
                        style={{ width: `${result.relevance * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-500">
                      {(result.relevance * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
