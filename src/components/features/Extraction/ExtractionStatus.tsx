'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loader2, CheckCircle, AlertCircle, Eye, Download } from 'lucide-react';

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
  status: 'idle' | 'processing' | 'success' | 'error';
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
            {status === 'processing' && (
              <Loader2 size={20} className="animate-spin text-blue-600" />
            )}
            {status === 'success' && (
              <CheckCircle size={20} className="text-green-600" />
            )}
            {status === 'error' && (
              <AlertCircle size={20} className="text-red-600" />
            )}

            <div>
              <p className="font-medium text-gray-900">{documentName}</p>
              <p className="text-sm text-gray-500">
                {status === 'processing'
                  ? 'Extracting content...'
                  : status === 'success'
                    ? 'Successfully extracted'
                    : 'Extraction failed'}
              </p>
            </div>
          </div>

          {status === 'success' && preview && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
            >
              <Eye size={16} />
              {showPreview ? 'Hide' : 'Preview'}
            </button>
          )}
        </div>

        {/* Metadata */}
        {status === 'success' && preview && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {preview.title && (
              <div>
                <p className="text-gray-500">Title</p>
                <p className="font-medium">{preview.title}</p>
              </div>
            )}
            {preview.author && (
              <div>
                <p className="text-gray-500">Author</p>
                <p className="font-medium">{preview.author}</p>
              </div>
            )}
            {preview.duration && (
              <div>
                <p className="text-gray-500">Duration</p>
                <p className="font-medium">{preview.duration}</p>
              </div>
            )}
            {preview.language && (
              <div>
                <p className="text-gray-500">Language</p>
                <p className="font-medium">{preview.language}</p>
              </div>
            )}
            {preview.chunks && (
              <div>
                <p className="text-gray-500">Chunks</p>
                <p className="font-medium">{preview.chunks}</p>
              </div>
            )}
            {preview.tokens && (
              <div>
                <p className="text-gray-500">Tokens</p>
                <p className="font-medium">{preview.tokens.toLocaleString()}</p>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {showPreview && preview && (
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {preview.textPreview}
            </p>
            {preview.textPreview.length > 500 && (
              <p className="text-xs text-gray-500 mt-2">... (truncated)</p>
            )}
          </div>
        )}

        {/* Error */}
        {status === 'error' && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
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
