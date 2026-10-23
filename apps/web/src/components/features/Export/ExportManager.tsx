"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Download, FileText, Loader2, Braces } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logger } from "@/lib/logger";

type ExportFormat = "pdf" | "markdown" | "docx" | "json" | "txt";

interface ExportOption {
  format: ExportFormat;
  label: string;
  icon: LucideIcon;
  description: string;
  speed: "fast" | "medium" | "slow";
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: "markdown",
    label: "Markdown",
    icon: FileText,
    description: "Clean markdown format, best for editing",
    speed: "fast",
  },
  {
    format: "pdf",
    label: "PDF",
    icon: FileText,
    description: "Professional PDF with formatting",
    speed: "medium",
  },
  {
    format: "docx",
    label: "Word",
    icon: FileText,
    description: "Microsoft Word format, editable",
    speed: "medium",
  },
  {
    format: "json",
    label: "JSON",
    icon: Braces,
    description: "Structured data format",
    speed: "fast",
  },
  {
    format: "txt",
    label: "Text",
    icon: FileText,
    description: "Plain text format",
    speed: "fast",
  },
];

interface ExportProps {
  content: string;
  onExport: (format: ExportFormat) => Promise<Blob>;
  filename?: string;
}

export function ExportManager({
  content,
  onExport,
  filename = "export",
}: ExportProps) {
  const [selectedFormat, setSelectedFormat] =
    useState<ExportFormat>("markdown");
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<ExportFormat | null>(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await onExport(selectedFormat);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExported(selectedFormat);
      setTimeout(() => setExported(null), 3000);
    } catch (error) {
      logger.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-display text-lg font-medium tracking-tight text-ink-100 mb-4">
          Export Content
        </h3>

        <div className="grid grid-cols-5 gap-2 mb-4">
          {EXPORT_OPTIONS.map((option) => (
            <button
              key={option.format}
              onClick={() => setSelectedFormat(option.format)}
              className={`p-3 border-2 transition text-center ${
                selectedFormat === option.format
                  ? "border-brand bg-ink-800"
                  : "border-ink-700 hover:border-ink-500"
              }`}
            >
              <option.icon className="h-6 w-6 mx-auto mb-1 text-brand" />
              <p className="text-xs font-medium text-ink-100">
                {option.label}
              </p>
            </button>
          ))}
        </div>

        {/* Selected format info */}
        {EXPORT_OPTIONS.find((o) => o.format === selectedFormat) && (
          <div className="bg-ink-850 border-hair border p-3 mb-4">
            <p className="text-sm text-ink-300">
              {
                EXPORT_OPTIONS.find((o) => o.format === selectedFormat)
                  ?.description
              }
            </p>
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 bg-brand text-ink-950 hover:bg-brand-dim disabled:bg-ink-700 font-mono text-[0.7rem] uppercase tracking-[0.12em] py-2 px-4 transition"
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
        <h4 className="font-display text-sm font-medium tracking-tight text-ink-100 mb-3">
          Export Statistics
        </h4>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-ink-500">Characters</p>
            <p className="font-display text-lg font-medium tracking-tight text-ink-100">
              {content.length.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-ink-500">Words</p>
            <p className="font-display text-lg font-medium tracking-tight text-ink-100">
              {content
                .split(/\s+/)
                .filter((w) => w.length > 0)
                .length.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-ink-500">Lines</p>
            <p className="font-display text-lg font-medium tracking-tight text-ink-100">
              {content.split("\n").length.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
