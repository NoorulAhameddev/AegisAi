"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  Trash2,
  Search,
  RefreshCw,
  Info,
} from "lucide-react";
import { logger } from "@/lib/logger";

interface RAGStats {
  totalDocuments: number;
  uniqueSources: number;
}

interface RAGDocument {
  id: string;
  text: string;
  metadata: any;
  chunkIndex?: number;
  sourceId?: string;
  createdAt: number;
}

export default function RAGManagement() {
  const [stats, setStats] = useState<RAGStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RAGDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/rag/stats");
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      logger.error("Failed to fetch RAG stats:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 3) {
      showMessage("error", "Query must be at least 3 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/rag/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, limit: 10 }),
      });

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
        showMessage("success", `Found ${data.count} relevant documents`);
      } else {
        showMessage("error", data.error || "Search failed");
      }
    } catch (error) {
      showMessage("error", "Search request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleIngestFile = async (fileId: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });

      const data = await response.json();
      if (data.success) {
        showMessage("success", data.message);
        fetchStats(); // Refresh stats
      } else {
        showMessage("error", data.error || "Ingestion failed");
      }
    } catch (error) {
      showMessage("error", "Ingestion request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    // TODO: Replace with a confirmation modal
    logger.info(`Delete source requested: ${sourceId}`);

    setLoading(true);
    try {
      const response = await fetch(`/api/rag/documents?sourceId=${sourceId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        showMessage("success", data.message);
        fetchStats(); // Refresh stats
        setSearchResults([]); // Clear search results
      } else {
        showMessage("error", data.error || "Deletion failed");
      }
    } catch (error) {
      showMessage("error", "Deletion request failed");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-ink-900 border border-hair p-6">
        <h1 className="font-display text-2xl font-medium tracking-tight mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand" />
          RAG Document Management
        </h1>
        <p className="text-ink-500 mb-4">
          Manage your knowledge base for Retrieval Augmented Generation
        </p>

        {/* Stats Section */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-ink-850 border border-hair p-4">
              <div className="text-sm text-ink-500">
                Total Chunks
              </div>
              <div className="text-3xl font-medium font-display text-brand">
                {stats.totalDocuments}
              </div>
            </div>
            <div className="bg-ink-850 border border-hair p-4">
              <div className="text-sm text-ink-500">
                Unique Sources
              </div>
              <div className="text-3xl font-medium font-display text-emerald-400">
                {stats.uniqueSources}
              </div>
            </div>
            <div className="bg-ink-850 border border-hair p-4 flex items-center justify-center">
              <button
                onClick={fetchStats}
                className="flex items-center gap-2 px-4 py-2 bg-brand text-ink-950 hover:bg-brand-dim font-medium"
                disabled={loading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div
            className={`p-4 border mb-4 ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Search Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-medium font-display tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5 text-brand" />
            Search Knowledge Base
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search for relevant documents..."
              className="flex-1 px-4 py-2 border border-hair bg-ink-950 text-ink-100 placeholder:text-ink-600 focus:border-brand focus:outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={loading || searchQuery.length < 3}
              className="px-6 py-2 bg-brand text-ink-950 hover:bg-brand-dim disabled:bg-ink-700 disabled:cursor-not-allowed disabled:text-ink-500 flex items-center gap-2 font-medium"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3 mt-4">
              <h3 className="font-medium text-lg">
                Search Results ({searchResults.length})
              </h3>
              {searchResults.map((doc, idx) => (
                <div
                  key={doc.id}
                  className="p-4 border border-hair bg-ink-850"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-sm text-ink-500">
                      <span className="font-mono bg-ink-800 text-brand px-2 py-1">
                        #{idx + 1}
                      </span>
                      {doc.metadata?.fileName && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {doc.metadata.fileName}
                        </span>
                      )}
                      {doc.chunkIndex !== undefined && (
                        <span className="text-xs">Chunk {doc.chunkIndex}</span>
                      )}
                    </div>
                    {doc.sourceId && (
                      <button
                        onClick={() => handleDeleteSource(doc.sourceId!)}
                        className="text-red-400 hover:text-red-300"
                        title="Delete all chunks from this source"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-ink-200 text-sm leading-relaxed">
                    {doc.text.substring(0, 300)}
                    {doc.text.length > 300 && "..."}
                  </p>
                  <div className="mt-2 text-xs text-ink-600">
                    Created: {new Date(doc.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 p-4 bg-ink-850 border border-hair">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div className="text-sm text-ink-300">
              <p className="font-medium mb-1">How RAG Works:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Upload documents through the Files page</li>
                <li>Documents are automatically chunked and embedded</li>
                <li>
                  During chat, relevant context is retrieved and used to augment
                  responses
                </li>
                <li>
                  The AI can reference your documents for more accurate answers
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
