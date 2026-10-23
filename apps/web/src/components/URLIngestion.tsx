/**
 * URL Ingestion Component
 * Import content from YouTube and web URLs
 */

"use client";

import { useState } from "react";
import { LinkIcon, YoutubeIcon, GlobeIcon } from "lucide-react";
import { logger } from "@/lib/logger";

interface URLIngestionProps {
  projectId?: string;
  onComplete?: (result: any) => void;
}

export default function URLIngestion({
  projectId,
  onComplete,
}: URLIngestionProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const detectURLType = (url: string): "youtube" | "webpage" | null => {
    if (!url.trim()) return null;

    try {
      const urlObj = new URL(url);
      if (
        urlObj.hostname.includes("youtube.com") ||
        urlObj.hostname.includes("youtu.be")
      ) {
        return "youtube";
      }
      return "webpage";
    } catch {
      return null;
    }
  };

  const ingestURL = async () => {
    const urlType = detectURLType(url);
    if (!urlType) {
      logger.warn("Invalid URL entered for ingestion");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const endpoint =
        urlType === "youtube" ? "/api/ingest/youtube" : "/api/ingest/webpage";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Ingestion failed");
      }

      const data = await response.json();
      setResult(data);
      setUrl("");

      if (onComplete) {
        onComplete(data);
      }
    } catch (error) {
      logger.error(
        "URL ingestion failed:",
        error instanceof Error ? error.message : "Failed to import from URL",
      );
    } finally {
      setLoading(false);
    }
  };

  const urlType = detectURLType(url);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <LinkIcon size={20} />
        Import from URL
      </h3>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or https://example.com/article"
            className="w-full px-4 py-2 border border-hair bg-ink-950 text-ink-100 placeholder:text-ink-600 focus:border-brand focus:outline-none pr-10"
            disabled={loading}
          />
          {urlType && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {urlType === "youtube" ? (
                <YoutubeIcon size={20} className="text-red-400" />
              ) : (
                <GlobeIcon size={20} className="text-brand" />
              )}
            </div>
          )}
        </div>
        <button
          onClick={ingestURL}
          disabled={loading || !url.trim()}
          className="px-6 py-2 bg-brand text-ink-950 hover:bg-brand-dim disabled:opacity-50 font-medium"
        >
          {loading ? "Importing..." : "Import"}
        </button>
      </div>

      {result && (
        <div className="p-4 border border-emerald-500/30 bg-emerald-500/10">
          <h4 className="font-medium text-emerald-300 mb-2">
            Successfully imported!
          </h4>
          <div className="text-sm space-y-1">
            <div>
              <span className="font-medium">Title:</span>{" "}
              {result.file?.name || result.fileName}
            </div>
            {result.file?.size && (
              <div>
                <span className="font-medium">Size:</span>{" "}
                {(result.file.size / 1024).toFixed(2)} KB
              </div>
            )}
            {result.vectorCount > 0 && (
              <div>
                <span className="font-medium">Processed:</span>{" "}
                {result.vectorCount} chunks indexed
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
        <p>Supported sources:</p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li>YouTube videos (transcript extraction)</li>
          <li>Web pages (article extraction)</li>
          <li>Blog posts and documentation</li>
        </ul>
      </div>
    </div>
  );
}
