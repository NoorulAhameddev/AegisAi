"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loader2, CheckCircle, AlertCircle, Eye, Download } from "lucide-react";

interface ExtractionPreview {
  title?: string;
  author?: string;
  duration?: string;
  language?: string;
  textPreview: string;
  chunks?: number;
  tokens?: number;
}

interface ExtractionStatusProps {
  status: "idle" | "processing" | "success" | "error";
  documentName: string;
  preview?: ExtractionPreview;
  error?: string;
  onRetry?: () => void;
}

export function ExtractionStatus({
  status,
  documentName,
  preview,
  error,
  onRetry,
}: ExtractionStatusProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status === "processing" && (
              <Loader2 size={20} className="animate-spin text-brand" />
            )}
            {status === "success" && (
              <CheckCircle size={20} className="text-green-600" />
            )}
            {status === "error" && (
              <AlertCircle size={20} className="text-red-600" />
            )}

            <div>
              <p className="font-medium text-ink-100">{documentName}</p>
              <p className="text-sm text-ink-500">
                {status === "processing"
                  ? "Extracting content..."
                  : status === "success"
                    ? "Successfully extracted"
                    : "Extraction failed"}
              </p>
            </div>
          </div>

          {status === "success" && preview && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-ink-800 text-brand hover:bg-ink-700"
            >
              <Eye size={16} />
              {showPreview ? "Hide" : "Preview"}
            </button>
          )}
        </div>

        {/* Metadata */}
        {status === "success" && preview && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {preview.title && (
              <div>
                <p className="text-ink-500">Title</p>
                <p className="font-medium">{preview.title}</p>
              </div>
            )}
            {preview.author && (
              <div>
                <p className="text-ink-500">Author</p>
                <p className="font-medium">{preview.author}</p>
              </div>
            )}
            {preview.duration && (
              <div>
                <p className="text-ink-500">Duration</p>
                <p className="font-medium">{preview.duration}</p>
              </div>
            )}
            {preview.language && (
              <div>
                <p className="text-ink-500">Language</p>
                <p className="font-medium">{preview.language}</p>
              </div>
            )}
            {preview.chunks && (
              <div>
                <p className="text-ink-500">Chunks</p>
                <p className="font-medium">{preview.chunks}</p>
              </div>
            )}
            {preview.tokens && (
              <div>
                <p className="text-ink-500">Tokens</p>
                <p className="font-medium">{preview.tokens.toLocaleString()}</p>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {showPreview && preview && (
          <div className="bg-ink-900 border border-hair p-4 max-h-64 overflow-y-auto">
            <p className="text-sm text-ink-300 whitespace-pre-wrap">
              {preview.textPreview}
            </p>
            {preview.textPreview.length > 500 && (
              <p className="text-xs text-ink-500 mt-2">... (truncated)</p>
            )}
          </div>
        )}

        {/* Error */}
        {status === "error" && error && (
          <div className="bg-red-500/10 border border-red-500/30 p-3">
            <p className="text-sm text-red-300">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 text-sm text-red-400 hover:text-red-300 font-medium"
              >
                Retry Extraction
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
