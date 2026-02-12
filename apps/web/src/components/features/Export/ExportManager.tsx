'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Download, FileText, Loader2 } from 'lucide-react';

type ExportFormat = 'pdf' | 'markdown' | 'docx' | 'json' | 'txt';

interface ExportOption {
  format: ExportFormat;
  label: string;
  icon: string;
  description: string;
  speed: 'fast' | 'medium' | 'slow';
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: 'markdown',
    label: 'Markdown',
    icon: '📝',
    description: 'Clean markdown format, best for editing',
    speed: 'fast',
  },
  {
    format: 'pdf',
    label: 'PDF',
    icon: '📄',
    description: 'Professional PDF with formatting',
    speed: 'medium',
  },
  {
    format: 'docx',
    label: 'Word',
    icon: '📋',
    description: 'Microsoft Word format, editable',
    speed: 'medium',
  },
  {
    format: 'json',
    label: 'JSON',
    icon: '{}',
    description: 'Structured data format',
    speed: 'fast',
  },
  {
    format: 'txt',
    label: 'Text',
    icon: '📃',
    description: 'Plain text format',
    speed: 'fast',
  },
];

interface ExportProps {
  content: string;
  onExport: (format: ExportFormat) => Promise<Blob>;
  filename?: string;
}

export function ExportManager({ content, onExport, filename = 'export' }: ExportProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<ExportFormat | null>(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await onExport(selectedFormat);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExported(selectedFormat);
      setTimeout(() => setExported(null), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Export Content</h3>

        <div className="grid grid-cols-5 gap-2 mb-4">
          {EXPORT_OPTIONS.map((option) => (
            <button
              key={option.format}
              onClick={() => setSelectedFormat(option.format)}
              className={`p-3 rounded-lg border-2 transition text-center ${
                selectedFormat === option.format
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="text-xl mb-1">{option.icon}</p>
              <p className="text-xs font-semibold">{option.label}</p>
            </button>
          ))}
        </div>

        {/* Selected format info */}
        {EXPORT_OPTIONS.find((o) => o.format === selectedFormat) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-900">
              {EXPORT_OPTIONS.find((o) => o.format === selectedFormat)?.description}
            </p>
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          {exporting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Exporting...
            </>
          ) : exported === selectedFormat ? (
            <>
              <Download size={18} />
              Downloaded!
            </>
          ) : (
            <>
              <Download size={18} />
              Export as {selectedFormat.toUpperCase()}
            </>
          )}
        </button>
      </Card>

      {/* Export Statistics */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-3">Export Statistics</h4>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-gray-500">Characters</p>
            <p className="text-lg font-bold">{content.length.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Words</p>
            <p className="text-lg font-bold">
              {content.split(/\s+/).filter((w) => w.length > 0).length.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Lines</p>
            <p className="text-lg font-bold">
              {content.split('\n').length.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
