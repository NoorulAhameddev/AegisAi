/**
 * Export Button Component
 * Export notes/chats to PDF, Markdown, or DOCX
 */

"use client";

import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { logger } from "@/lib/logger";

interface ExportButtonProps {
  type: "note" | "chat";
  itemId: string;
  itemTitle?: string;
}

export default function ExportButton({
  type,
  itemId,
  itemTitle,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const exportAs = async (format: "pdf" | "markdown" | "docx") => {
    setLoading(true);
    setIsOpen(false);

    try {
      const endpoint =
        type === "note" ? "/api/notes/export" : "/api/chat/export";
      const body =
        type === "note" ? { noteId: itemId, format } : { chatId: itemId };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        response.headers
          .get("Content-Disposition")
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || `export-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logger.error("Export failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
        title="Export"
      >
        <DownloadIcon size={18} />
        {loading ? "Exporting..." : "Export"}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            <div className="p-2 space-y-1">
              <button
                onClick={() => exportAs("pdf")}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Export as PDF
              </button>
              {type === "note" && (
                <>
                  <button
                    onClick={() => exportAs("markdown")}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Export as Markdown
                  </button>
                  <button
                    onClick={() => exportAs("docx")}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Export as DOCX
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
