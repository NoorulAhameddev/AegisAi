/**
 * Batch Upload Component
 * Multiple file upload with drag-and-drop
 */

"use client";

import { useState, useRef } from "react";
import {
  UploadIcon,
  XIcon,
  FileIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";
import { logger } from "@/lib/logger";

interface BatchUploadProps {
  projectId?: string;
  onUploadComplete?: (results: any[]) => void;
}

interface FileStatus {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export default function BatchUpload({
  projectId,
  onUploadComplete,
}: BatchUploadProps) {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList) => {
    const fileArray = Array.from(newFiles).map((file) => ({
      file,
      status: "pending" as const,
    }));
    setFiles([...files, ...fileArray]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    files.forEach((fileStatus, index) => {
      formData.append(`file-${index}`, fileStatus.file);
    });

    if (projectId) {
      formData.append("projectId", projectId);
    }

    try {
      const response = await fetch("/api/files/batch-upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      // Update file statuses
      const updatedFiles = files.map((fileStatus, index) => {
        const result = data.results[index];
        return {
          ...fileStatus,
          status: result.success ? "success" : "error",
          error: result.error,
        };
      });

      setFiles(updatedFiles as FileStatus[]);

      if (onUploadComplete) {
        onUploadComplete(data.results);
      }
    } catch (error) {
      logger.error("Batch upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const clearAll = () => {
    setFiles([]);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
          dragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-700"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          aria-label="Upload files"
          title="Upload files"
        />
        <UploadIcon size={48} className="mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium mb-2">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Supports PDF, DOCX, TXT, Markdown, Audio, and more
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Select Files
        </button>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{files.length} file(s) selected</h4>
            <button
              onClick={clearAll}
              disabled={uploading}
              className="text-sm text-red-600 hover:underline disabled:opacity-50"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-300 dark:border-gray-700 rounded-lg p-3">
            {files.map((fileStatus, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded"
              >
                <FileIcon size={18} className="text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {fileStatus.file.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                {fileStatus.status === "success" && (
                  <CheckCircleIcon size={20} className="text-green-600" />
                )}
                {fileStatus.status === "error" && (
                  <XCircleIcon size={20} className="text-red-600" />
                )}
                {fileStatus.status === "pending" && !uploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-500 hover:text-red-600"
                    title="Remove file"
                    aria-label="Remove file"
                  >
                    <XIcon size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={uploadFiles}
            disabled={uploading || files.length === 0}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {uploading ? "Uploading..." : `Upload ${files.length} file(s)`}
          </button>
        </div>
      )}
    </div>
  );
}
