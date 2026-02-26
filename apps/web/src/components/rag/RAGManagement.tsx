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
      console.error("Failed to fetch RAG stats:", error);
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
    if (
      !confirm("Are you sure you want to delete all chunks from this source?")
    ) {
      return;
    }

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6" />
          RAG Document Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Manage your knowledge base for Retrieval Augmented Generation
        </p>

        {/* Stats Section */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Chunks
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalDocuments}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Unique Sources
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.uniqueSources}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg flex items-center justify-center">
              <button
                onClick={fetchStats}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
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
            className={`p-4 rounded-lg mb-4 ${
              message.type === "success"
                ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Search Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Knowledge Base
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search for relevant documents..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              disabled={loading || searchQuery.length < 3}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3 mt-4">
              <h3 className="font-semibold text-lg">
                Search Results ({searchResults.length})
              </h3>
              {searchResults.map((doc, idx) => (
                <div
                  key={doc.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-mono bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
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
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete all chunks from this source"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                    {doc.text.substring(0, 300)}
                    {doc.text.length > 300 && "..."}
                  </p>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    Created: {new Date(doc.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="font-semibold mb-1">How RAG Works:</p>
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
