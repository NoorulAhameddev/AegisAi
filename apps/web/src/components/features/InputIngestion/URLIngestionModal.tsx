"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Notification } from "@/components/ui/Notification";
import { AlertCircle, Check, X, Play, Globe } from "lucide-react";

interface URLIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, type: "youtube" | "webpage") => Promise<void>;
  loading?: boolean;
}

export function URLIngestionModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}: URLIngestionModalProps) {
  const [url, setUrl] = useState("");
  const [urlType, setUrlType] = useState<"youtube" | "webpage">("youtube");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validateURL = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    if (!validateURL(url)) {
      setError("Please enter a valid URL");
      return;
    }

    // Auto-detect YouTube URLs
    let detectedType = urlType;
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      detectedType = "youtube";
    }

    try {
      setError("");
      await onSubmit(url, detectedType);
      setSuccess(
        `${detectedType === "youtube" ? "YouTube" : "Webpage"} submitted successfully!`,
      );
      setTimeout(() => {
        setUrl("");
        setSuccess("");
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to ingest URL");
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Ingest URL">
      <div className="space-y-4">
        {/* URL Type Selector */}
        <div className="flex gap-2">
          {(["youtube", "webpage"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setUrlType(type)}
              className={`flex-1 px-4 py-2 font-medium transition ${
                urlType === type
                  ? "bg-brand text-ink-950"
                  : "bg-ink-800 text-ink-300 hover:bg-ink-700"
              }`}
            >
              {type === "youtube" ? (
                <>
                  <Play size={14} className="inline mr-1" /> YouTube
                </>
              ) : (
                <>
                  <Globe size={14} className="inline mr-1" /> Webpage
                </>
              )}
            </button>
          ))}
        </div>

        {/* URL Input */}
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={
            urlType === "youtube"
              ? "https://www.youtube.com/watch?v=..."
              : "https://example.com/page"
          }
          className="w-full"
        />

        {/* Helpful text */}
        <div className="bg-ink-850 border-hair border p-3">
          <p className="text-sm text-ink-300">
            {urlType === "youtube"
              ? "Extracts transcript, timestamps, and metadata"
              : "Extracts text, links, and structured content"}
          </p>
        </div>

        {error && <Notification type="error" message={error} />}
        {success && <Notification type="success" message={success} />}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-hair font-medium text-ink-100 hover:bg-ink-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !url.trim()}
            className="flex-1 bg-brand text-ink-950 hover:bg-brand-dim disabled:bg-ink-700 font-medium py-2 px-4 transition"
          >
            {loading ? "Processing..." : "Ingest URL"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
