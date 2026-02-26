import { useState } from "react";

/**
 * Hook: useTextProcessing
 * Handles text input, extraction, and AI processing
 */
export function useTextProcessing() {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const processText = async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/text/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Processing failed");

      const data = await response.json();
      setContent(data.processed);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { content, loading, error, processText };
}

/**
 * Hook: useFileUpload
 * Handles file uploads with progress tracking
 */
export function useFileUpload() {
  const [uploadStatus, setUploadStatus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      // Progress tracking
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadStatus((prev) => ({
            ...prev,
            [file.name]: percentComplete,
          }));
        }
      });

      // Handle completion
      return new Promise((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } else {
            reject(new Error("Upload failed"));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload error"));
        });

        xhr.open("POST", "/api/files/upload");
        xhr.send(formData);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { uploadStatus, loading, error, uploadFile };
}

/**
 * Hook: useAIGeneration
 * Handles all AI capability generations (summarize, notes, etc)
 */
export function useAIGeneration() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (
    capability: string,
    content: string,
    customPrompt?: string,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/${capability}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, customPrompt }),
      });

      if (!response.ok) throw new Error("Generation failed");

      const data = await response.json();
      setResult(data.result);
      return data.result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, error, generate };
}

/**
 * Hook: useChat
 * Real-time chat with RAG support
 */
export function useChat() {
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
    }>
  >([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (message: string, context?: string) => {
    setLoading(true);
    setError(null);

    try {
      const userMsg = {
        id: Date.now().toString(),
        role: "user" as const,
        content: message,
      };
      setMessages((prev) => [...prev, userMsg]);

      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context, chatId: null }),
      });

      if (!response.ok) throw new Error("Chat failed");

      const data = await response.json();
      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: data.response,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      return data.response;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, error, sendMessage };
}

/**
 * Hook: useRAGSearch
 * Semantic search across documents
 */
export function useRAGSearch() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string, documentIds: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/rag/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, documentIds, topK: 10 }),
      });

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      setResults(data.results);
      return data.results;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, search };
}

/**
 * Hook: useExport
 * Handle exporting to various formats
 */
export function useExport() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const exportContent = async (
    content: string,
    format: "pdf" | "markdown" | "docx" | "json" | "txt",
    filename: string,
  ): Promise<Blob> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, format, filename }),
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return blob;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, exportContent };
}

/**
 * Hook: useDocumentStorage
 * Save and manage documents
 */
export function useDocumentStorage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveDocument = async (
    title: string,
    content: string,
    tags: string[],
  ): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/documents/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, tags }),
      });

      if (!response.ok) throw new Error("Save failed");

      const data = await response.json();
      await loadDocuments(); // Refresh list
      return data.documentId;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      await loadDocuments(); // Refresh list
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch("/api/documents");
      if (!response.ok) throw new Error("Load failed");

      const data = await response.json();
      setDocuments(data.documents);
    } catch (err) {
      console.error("Load error:", err);
    }
  };

  return {
    documents,
    loading,
    error,
    saveDocument,
    deleteDocument,
    loadDocuments,
  };
}
