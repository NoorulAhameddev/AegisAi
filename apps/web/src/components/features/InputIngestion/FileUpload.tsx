"use client";

import React, { useState, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Notification } from "@/components/ui/Notification";
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  acceptedFormats?: string[];
  maxFileSize?: number; // in MB
  loading?: boolean;
}

const ACCEPTED_FORMATS = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  jpg: "image/jpeg",
  png: "image/png",
};

export function FileUpload({
  onUpload,
  acceptedFormats = ["pdf", "docx", "txt", "md", "mp3", "wav", "jpg", "png"],
  maxFileSize = 100,
  loading = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [uploadStatus, setUploadStatus] = useState<
    Record<string, "pending" | "uploading" | "success" | "error">
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !acceptedFormats.includes(ext)) {
      return `File format .${ext} not supported. Accepted: ${acceptedFormats.join(", ")}`;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxFileSize) {
      return `File size (${sizeMB.toFixed(2)}MB) exceeds limit of ${maxFileSize}MB`;
    }

    return null;
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const validationError = validateFile(file);

      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
      } else {
        newFiles.push(file);
      }
    }

    if (errors.length > 0) {
      setError(errors.join("\n"));
      return;
    }

    setFiles([...files, ...newFiles]);
    setError("");

    // Initialize upload status
    const newStatus: Record<
      string,
      "pending" | "uploading" | "success" | "error"
    > = {};
    newFiles.forEach((f) => {
      newStatus[f.name] = "pending";
    });
    setUploadStatus((prev) => ({ ...prev, ...newStatus }));
  };

  const handleUpload = async (file: File) => {
    try {
      setUploadStatus((prev) => ({ ...prev, [file.name]: "uploading" }));
      await onUpload(file);
      setUploadStatus((prev) => ({ ...prev, [file.name]: "success" }));
      setTimeout(() => {
        setFiles((prev) => prev.filter((f) => f.name !== file.name));
      }, 2000);
    } catch (err) {
      setUploadStatus((prev) => ({ ...prev, [file.name]: "error" }));
      setError(`Upload failed for ${file.name}`);
    }
  };

  const handleUploadAll = async () => {
    for (const file of files) {
      if (uploadStatus[file.name] !== "success") {
        await handleUpload(file);
      }
    }
  };

  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
    setUploadStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[fileName];
      return newStatus;
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upload Files</h3>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileSelect(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition cursor-pointer"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedFormats
              .map(
                (ext) =>
                  ACCEPTED_FORMATS[ext as keyof typeof ACCEPTED_FORMATS] ||
                  `.${ext}`,
              )
              .join(",")}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          <Upload className="mx-auto mb-2 text-gray-400" size={32} />
          <p className="text-sm font-medium text-gray-700">
            Drag files here or{" "}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:underline"
            >
              click to browse
            </button>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Max {maxFileSize}MB • Formats: {acceptedFormats.join(", ")}
          </p>
        </div>

        {error && <Notification type="error" message={error} />}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {files.length} file(s) selected
            </p>
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {uploadStatus[file.name] === "uploading" && (
                    <Loader2
                      size={18}
                      className="animate-spin text-blue-600 flex-shrink-0"
                    />
                  )}
                  {uploadStatus[file.name] === "success" && (
                    <CheckCircle
                      size={18}
                      className="text-green-600 flex-shrink-0"
                    />
                  )}
                  {uploadStatus[file.name] === "error" && (
                    <AlertCircle
                      size={18}
                      className="text-red-600 flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {uploadStatus[file.name] !== "success" && (
                  <button
                    onClick={() => removeFile(file.name)}
                    className="ml-2 text-gray-400 hover:text-red-600"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <button
            onClick={handleUploadAll}
            disabled={
              loading || files.every((f) => uploadStatus[f.name] === "success")
            }
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            {loading ? "Uploading..." : `Upload ${files.length} file(s)`}
          </button>
        )}
      </div>
    </Card>
  );
}
