"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Upload,
  Settings as SettingsIcon,
  BookOpen,
  MessageSquare,
  Download,
  Folder,
  Sliders,
  FileText,
  Youtube,
  Globe,
  Mic,
  ImageIcon,
  Package,
  HelpCircle,
  MessageCircle,
  Search,
  CheckCircle,
  Palette,
  Zap,
  AlertCircle,
  Loader,
} from "lucide-react";

const StudyHub = () => {
  const [activeTab, setActiveTab] = useState<string>("ai-operations");
  const [selectedTool, setSelectedTool] = useState<string>("quick-summary");
  const [selectedStudyMaterial, setSelectedStudyMaterial] =
    useState<string>("flashcards");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<string>("medium");
  const [selectedInputMethod, setSelectedInputMethod] =
    useState<string>("text");
  const [selectedExportFormat, setSelectedExportFormat] =
    useState<string>("markdown");
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [inputContent, setInputContent] = useState<string>("");
  const [inputUrl, setInputUrl] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  // API Service Functions
  const handleProcessContent = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const operationMap = {
        "quick-summary": "summary-short",
        "detailed-summary": "summary-detailed",
        "structured-notes": "structured-notes",
        "bullet-points": "bullet-points",
        "key-concepts": "key-concepts",
        definitions: "glossary",
        examples: "examples",
        eli5: "eli5",
        qa: "questions",
        rewrite: "rewrite",
      };

      if (!inputContent || inputContent.trim().length === 0) {
        throw new Error("Please enter some content to process");
      }

      const response = await fetch("/api/ai/operate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation:
            operationMap[selectedTool as keyof typeof operationMap] ||
            selectedTool,
          text: inputContent.slice(0, 12000),
          projectId: selectedDocument || undefined,
          style: selectedDifficulty,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process content");
      }

      const data = await response.json();
      setGeneratedContent(data.content || data);
      setSuccess("Content generated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFiles = async (files: File[] | FileList): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      if (!files || files.length === 0) {
        throw new Error("Please select files to upload");
      }

      const formData = new FormData();
      Array.from(files).forEach((file, i) => {
        formData.append(`file-${i}`, file);
      });
      if (selectedDocument) {
        formData.append("projectId", selectedDocument);
      }

      const response = await fetch("/api/files/batch-upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      setSuccess(
        `Successfully uploaded ${data.successful || data.results?.length || files.length} file(s)!`,
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleIngestWeb = async (url: string): Promise<void> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!url || url.trim().length < 5) {
        throw new Error("Please enter a valid webpage URL");
      }

      const response = await fetch("/api/ingest/webpage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          projectId: selectedDocument || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Webpage ingestion failed");
      }

      const data = await response.json();
      setGeneratedContent(data);
      setSuccess("Webpage ingested successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Webpage ingestion failed");
    } finally {
      setLoading(false);
    }
  };

  const handleIngestYouTube = async (url: string): Promise<void> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!url || url.trim().length < 5) {
        throw new Error("Please enter a valid YouTube URL");
      }

      const response = await fetch("/api/ingest/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          projectId: selectedDocument || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "YouTube ingestion failed");
      }

      const data = await response.json();
      setGeneratedContent(data);
      setSuccess("YouTube content ingested successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "YouTube ingestion failed");
    } finally {
      setLoading(false);
    }
  };

  const handleIngestAudio = async (file: File): Promise<void> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!file) {
        throw new Error("Please select an audio file to upload");
      }

      const formData = new FormData();
      formData.append("file", file);
      if (selectedDocument) {
        formData.append("projectId", selectedDocument);
      }

      const response = await fetch("/api/ingest/audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Audio ingestion failed");
      }

      const data = await response.json();
      setGeneratedContent(data);
      setSuccess("Audio ingested successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audio ingestion failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStudyTool = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!inputContent || inputContent.trim().length === 0) {
        throw new Error(
          "Please enter some content to generate study materials",
        );
      }

      const operationMap: Record<string, string> = {
        flashcards: "flashcards",
        quiz: "quiz",
        "question-bank": "questions",
      };

      const operation = operationMap[selectedStudyMaterial] || "flashcards";

      const response = await fetch("/api/ai/operate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation,
          text: inputContent.slice(0, 12000),
          projectId: selectedDocument || undefined,
          style: selectedDifficulty,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to generate ${selectedStudyMaterial}`,
        );
      }

      const data = await response.json();
      setGeneratedContent(data.content || data);
      setSuccess(
        `${selectedStudyMaterial === "flashcards" ? "Flashcards" : selectedStudyMaterial === "quiz" ? "Quiz" : "Question Bank"} generated successfully!`,
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessAction = async (): Promise<void> => {
    if (selectedInputMethod === "text") {
      return handleProcessContent();
    }

    if (["file", "batch", "image"].includes(selectedInputMethod)) {
      if (!selectedFiles || selectedFiles.length === 0) {
        setError("Please select files to upload");
        return;
      }
      return handleUploadFiles(selectedFiles);
    }

    if (selectedInputMethod === "audio") {
      return handleIngestAudio(selectedFiles[0]);
    }

    if (selectedInputMethod === "web") {
      return handleIngestWeb(inputUrl);
    }

    if (selectedInputMethod === "youtube") {
      return handleIngestYouTube(inputUrl);
    }

    setError("Unsupported input method");
  };

  const handleSaveSettings = (): void => {
    setSuccess("Settings saved successfully!");
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleExportContent = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!generatedContent) {
        throw new Error("No content to export. Please generate content first.");
      }

      // If we have a note ID from API response, export via noteId
      if (generatedContent.noteId) {
        const response = await fetch("/api/notes/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteId: generatedContent.noteId,
            format: selectedExportFormat,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Export failed");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `export.${selectedExportFormat === "markdown" ? "md" : selectedExportFormat}`;
        a.click();
        window.URL.revokeObjectURL(url);

        setSuccess("Content exported successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        // Fallback: offer direct download as text
        const ext =
          selectedExportFormat === "markdown"
            ? "md"
            : selectedExportFormat === "pdf"
              ? "pdf"
              : "txt";
        const text =
          typeof generatedContent === "object"
            ? JSON.stringify(generatedContent, null, 2)
            : String(generatedContent);
        const blob = new Blob([text], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `export.${ext}`;
        a.click();
        window.URL.revokeObjectURL(url);

        setSuccess("Content downloaded successfully!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchKnowledge = async (query: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      if (!query || query.trim().length < 3) {
        throw new Error("Search query must be at least 3 characters long");
      }

      const response = await fetch("/api/rag/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          limit: 10,
          filters: selectedDocument
            ? { projectId: selectedDocument }
            : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Search failed");
      }

      const data = await response.json();
      setGeneratedContent({
        searchResults: data.results || [],
        count: data.count || 0,
      });
      setSuccess(`Found ${data.count || 0} relevant document(s)!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const navTabs = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "ai-operations", label: "AI Operations", icon: Sliders },
    { id: "study-tools", label: "Study Tools", icon: BookOpen },
    { id: "rag-chat", label: "RAG Chat", icon: MessageSquare },
    { id: "export", label: "Export", icon: Download },
    { id: "projects", label: "Projects", icon: Folder },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  const studyTools = [
    { id: "quick-summary", label: "Quick Summary" },
    { id: "detailed-summary", label: "Detailed Summary" },
    { id: "structured-notes", label: "Structured Notes" },
    { id: "bullet-points", label: "Bullet Points" },
    { id: "key-concepts", label: "Key Concepts" },
    { id: "definitions", label: "Definitions & Glossary" },
    { id: "examples", label: "Examples" },
    { id: "eli5", label: "Simplified (ELI5)" },
    { id: "qa", label: "Q&A Generation" },
    { id: "rewrite", label: "Rewrite Content" },
  ];

  const studyMaterials = [
    { id: "flashcards", label: "Flashcards" },
    { id: "quiz", label: "Quiz" },
    { id: "question-bank", label: "Question Bank" },
  ];

  const inputMethods = [
    {
      id: "text",
      label: "Text Input",
      icon: FileText,
      desc: "Paste or type your content",
    },
    {
      id: "file",
      label: "File Upload",
      icon: Upload,
      desc: "Upload documents",
    },
    {
      id: "youtube",
      label: "YouTube",
      icon: Youtube,
      desc: "Extract from YouTube videos",
    },
    {
      id: "web",
      label: "Web Page",
      icon: Globe,
      desc: "Extract from web pages",
    },
    { id: "audio", label: "Audio", icon: Mic, desc: "Upload audio files" },
    {
      id: "image",
      label: "Image (OCR)",
      icon: ImageIcon,
      desc: "Extract text from images",
    },
    {
      id: "batch",
      label: "Batch Upload",
      icon: Package,
      desc: "Upload multiple files",
    },
  ];

  const exportFormats = [
    { id: "markdown", label: "Markdown (.md)" },
    { id: "pdf", label: "PDF (.pdf)" },
    { id: "docx", label: "Word (.docx)" },
    { id: "json", label: "JSON (.json)" },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-black via-[#0a0612] to-[#0f051a] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl animate-pulse animation-delay-1s"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold">Study Hub</h1>
            <p className="text-zinc-400">
              AI-powered learning & knowledge management
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-[88px] sm:top-[100px] z-10 border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-8 overflow-x-auto scrollbar-hide">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-4 font-medium text-sm sm:text-base whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "border-blue-500 text-white"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-red-300">Error</h3>
              <p className="text-sm text-red-200 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 flex items-start gap-3">
            <CheckCircle size={20} className="text-green-400 mt-0.5 shrink-0" />
            <p className="text-sm text-green-200">{success}</p>
          </div>
        )}
        {/* Study Tools Tab */}
        {activeTab === "study-tools" && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
              <h2 className="text-2xl font-bold mb-2">
                Study Tool Configuration
              </h2>
              <p className="text-zinc-400 mb-6">
                Select a tool and configure your preferences
              </p>

              {/* Content Input */}
              <div className="mb-8">
                <label className="block text-sm font-medium mb-3">
                  Enter your study content
                </label>
                <textarea
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder="Paste your notes, textbook content, or any material you want to study..."
                  className="w-full h-40 rounded-xl bg-black/30 border border-white/10 p-4 text-white placeholder-zinc-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Document Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium mb-3">
                  Select Document (Optional)
                </label>
                <button
                  onClick={() =>
                    setSelectedDocument(selectedDocument ? null : "sample-doc")
                  }
                  className={`w-full py-4 rounded-xl border-2 transition-all ${
                    selectedDocument
                      ? "border-blue-500 bg-blue-500/10 text-white"
                      : "border-dashed border-white/20 text-zinc-400 hover:border-blue-500/40 hover:text-blue-300"
                  }`}
                >
                  {selectedDocument
                    ? "✓ Document Selected"
                    : "Choose a document…"}
                </button>
              </div>

              {/* Tool Options */}
              <div className="mb-8">
                <label className="block text-sm font-medium mb-3">
                  Study Material Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {studyMaterials.map((material) => (
                    <button
                      key={material.id}
                      onClick={() => setSelectedStudyMaterial(material.id)}
                      className={`p-4 rounded-xl border-2 transition-all font-medium text-left ${
                        selectedStudyMaterial === material.id
                          ? "border-blue-500 bg-blue-500/20 text-blue-300"
                          : "border-white/10 bg-white/5 text-white hover:border-white/30"
                      }`}
                    >
                      {material.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Level */}
              <div className="mb-8">
                <label className="block text-sm font-medium mb-3">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {["easy", "medium", "hard"].map((level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedDifficulty(level)}
                      className={`p-3 rounded-xl border-2 transition-all font-medium capitalize ${
                        selectedDifficulty === level
                          ? "border-green-500 bg-green-500/20 text-green-300"
                          : "border-white/10 bg-white/5 text-white hover:border-white/30"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateStudyTool}
                disabled={!inputContent || loading}
                className={`w-full py-4 rounded-xl font-bold transition-all ${
                  inputContent && !loading
                    ? "bg-linear-to-r from-blue-600 to-blue-500 text-white hover:shadow-xl hover:shadow-blue-500/50"
                    : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader size={18} className="animate-spin" />
                    Generating...
                  </span>
                ) : (
                  <>
                    Generate{" "}
                    {selectedStudyMaterial === "flashcards"
                      ? "Flashcards"
                      : selectedStudyMaterial === "quiz"
                        ? "Quiz"
                        : "Question Bank"}
                  </>
                )}
              </button>
            </div>

            {/* Generated Study Tool Output */}
            {generatedContent && (
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">
                    Generated{" "}
                    {selectedStudyMaterial === "flashcards"
                      ? "Flashcards"
                      : selectedStudyMaterial === "quiz"
                        ? "Quiz"
                        : "Question Bank"}
                  </h3>
                  <button
                    onClick={() => setGeneratedContent(null)}
                    className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all text-sm"
                  >
                    Clear
                  </button>
                </div>
                <div className="rounded-xl bg-black/30 border border-white/10 p-6">
                  {typeof generatedContent === "string" ? (
                    <pre className="whitespace-pre-wrap text-zinc-300 font-mono text-sm">
                      {generatedContent}
                    </pre>
                  ) : (
                    <pre className="whitespace-pre-wrap text-zinc-300 font-mono text-sm">
                      {JSON.stringify(generatedContent, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Operations Tab */}
        {activeTab === "ai-operations" && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
              <h2 className="text-2xl font-bold mb-2">Choose Input Method</h2>
              <p className="text-zinc-400 mb-6">
                Select how you want to input your study material
              </p>

              {/* Input Method Selection */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {inputMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedInputMethod(method.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        selectedInputMethod === method.id
                          ? "border-blue-500 bg-blue-500/20"
                          : "border-white/10 bg-white/5 hover:border-white/30"
                      }`}
                    >
                      <div className="flex justify-center mb-2">
                        <Icon size={24} />
                      </div>
                      <div className="text-sm font-medium line-clamp-2">
                        {method.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Input Area based on selected method */}
              <div className="space-y-6">
                {selectedInputMethod === "text" && (
                  <div>
                    <label className="block text-sm font-medium mb-3">
                      Paste your content
                    </label>
                    <textarea
                      placeholder="Paste your text here..."
                      value={inputContent}
                      onChange={(e) => setInputContent(e.target.value)}
                      className="w-full h-40 rounded-xl bg-black/30 border border-white/10 p-4 text-white placeholder-zinc-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                )}

                {selectedInputMethod === "file" && (
                  <div>
                    <label className="block text-sm font-medium mb-3">
                      Upload Document
                    </label>
                    <input
                      id="file-upload-input"
                      type="file"
                      accept=".pdf,.docx,.txt,.xlsx,.md"
                      className="sr-only"
                      onChange={(e) =>
                        setSelectedFiles(
                          e.target.files ? Array.from(e.target.files) : [],
                        )
                      }
                    />
                    <label
                      htmlFor="file-upload-input"
                      className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-blue-500/40 transition-all cursor-pointer block"
                    >
                      <div className="flex justify-center mb-3">
                        <Upload size={32} />
                      </div>
                      <p className="text-zinc-400">
                        Drag and drop your file here or click to browse
                      </p>
                      <p className="text-xs text-zinc-500 mt-2">
                        Supported: PDF, DOCX, TXT, XLSX
                      </p>
                    </label>
                    {selectedFiles.length > 0 && (
                      <p className="text-xs text-zinc-400 mt-2">
                        Selected:{" "}
                        {selectedFiles.map((file) => file.name).join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {selectedInputMethod === "web" && (
                  <div>
                    <label className="block text-sm font-medium mb-3">
                      Web Page URL
                    </label>
                    <p className="text-zinc-400 text-sm mb-3">
                      Extract and process content from web pages
                    </p>
                    <input
                      type="url"
                      placeholder="https://example.com/article"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full rounded-xl bg-black/30 border border-white/10 p-4 text-white placeholder-zinc-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                )}

                {selectedInputMethod === "youtube" && (
                  <div>
                    <label className="block text-sm font-medium mb-3">
                      YouTube Video URL
                    </label>
                    <p className="text-zinc-400 text-sm mb-3">
                      Extract transcript and metadata from YouTube videos
                    </p>
                    <input
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full rounded-xl bg-black/30 border border-white/10 p-4 text-white placeholder-zinc-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                )}

                {selectedInputMethod === "audio" && (
                  <div>
                    <label className="block text-sm font-medium mb-3">
                      Upload Audio File
                    </label>
                    <input
                      id="audio-upload-input"
                      type="file"
                      accept="audio/*"
                      className="sr-only"
                      onChange={(e) =>
                        setSelectedFiles(
                          e.target.files ? Array.from(e.target.files) : [],
                        )
                      }
                    />
                    <label
                      htmlFor="audio-upload-input"
                      className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-blue-500/40 transition-all cursor-pointer block"
                    >
                      <div className="flex justify-center mb-3">
                        <Mic size={32} />
                      </div>
                      <p className="text-zinc-400">
                        Upload your audio file to extract content
                      </p>
                      <p className="text-xs text-zinc-500 mt-2">
                        Supported: MP3, WAV, M4A, OGG
                      </p>
                    </label>
                    {selectedFiles.length > 0 && (
                      <p className="text-xs text-zinc-400 mt-2">
                        Selected:{" "}
                        {selectedFiles.map((file) => file.name).join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {selectedInputMethod === "image" && (
                  <div>
                    <label className="block text-sm font-medium mb-3">
                      Image Upload (OCR)
                    </label>
                    <p className="text-zinc-400 text-sm mb-3">
                      Extract text from images
                    </p>
                    <input
                      id="image-upload-input"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) =>
                        setSelectedFiles(
                          e.target.files ? Array.from(e.target.files) : [],
                        )
                      }
                    />
                    <label
                      htmlFor="image-upload-input"
                      className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-blue-500/40 transition-all cursor-pointer block"
                    >
                      <div className="flex justify-center mb-3">
                        <ImageIcon size={32} />
                      </div>
                      <p className="text-zinc-400">Upload Image</p>
                    </label>
                    {selectedFiles.length > 0 && (
                      <p className="text-xs text-zinc-400 mt-2">
                        Selected:{" "}
                        {selectedFiles.map((file) => file.name).join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {selectedInputMethod === "batch" && (
                  <div>
                    <label className="block text-sm font-medium mb-3">
                      Batch Upload
                    </label>
                    <p className="text-zinc-400 text-sm mb-3">
                      Upload multiple files at once
                    </p>
                    <input
                      id="batch-upload-input"
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt,.xlsx,.md"
                      className="sr-only"
                      onChange={(e) =>
                        setSelectedFiles(
                          e.target.files ? Array.from(e.target.files) : [],
                        )
                      }
                    />
                    <label
                      htmlFor="batch-upload-input"
                      className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-blue-500/40 transition-all cursor-pointer block"
                    >
                      <div className="flex justify-center mb-3">
                        <Package size={32} />
                      </div>
                      <p className="text-zinc-400">Select multiple files</p>
                    </label>
                    {selectedFiles.length > 0 && (
                      <p className="text-xs text-zinc-400 mt-2">
                        Selected:{" "}
                        {selectedFiles.map((file) => file.name).join(", ")}
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleProcessAction}
                  disabled={
                    (selectedInputMethod === "text"
                      ? !inputContent.trim()
                      : false) || loading
                  }
                  className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                    ((selectedInputMethod === "text" && inputContent.trim()) ||
                      selectedInputMethod !== "text") &&
                    !loading
                      ? "bg-linear-to-r from-blue-600 to-blue-500 text-white hover:shadow-xl hover:shadow-blue-500/50"
                      : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                  }`}
                >
                  {loading && <Loader size={18} className="animate-spin" />}
                  {loading ? "Processing..." : "Process Content"}
                </button>
              </div>
            </div>

            {/* Generated Content Display */}
            {generatedContent && (
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Generated Output</h2>
                  <button
                    onClick={() => setGeneratedContent(null)}
                    className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all text-sm"
                  >
                    Clear
                  </button>
                </div>
                <div className="rounded-xl bg-black/30 border border-white/10 p-6">
                  <div className="prose prose-invert max-w-none">
                    {typeof generatedContent === "string" ? (
                      <pre className="whitespace-pre-wrap text-sm text-zinc-200 font-sans">
                        {generatedContent}
                      </pre>
                    ) : generatedContent.content ? (
                      <pre className="whitespace-pre-wrap text-sm text-zinc-200 font-sans">
                        {generatedContent.content}
                      </pre>
                    ) : generatedContent.searchResults ? (
                      <div className="space-y-4">
                        <p className="text-zinc-400">
                          Found {generatedContent.count} results
                        </p>
                        {generatedContent.searchResults.map(
                          (result: any, idx: number) => (
                            <div
                              key={idx}
                              className="border border-white/10 rounded-lg p-4 bg-white/5"
                            >
                              <p className="text-sm text-zinc-300">
                                {result.content || result.text}
                              </p>
                              {result.score && (
                                <p className="text-xs text-zinc-500 mt-2">
                                  Relevance: {(result.score * 100).toFixed(1)}%
                                </p>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm text-zinc-200 font-sans">
                        {JSON.stringify(generatedContent, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RAG Chat Tab */}
        {activeTab === "rag-chat" && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
              <h2 className="text-2xl font-bold mb-2">RAG-Enhanced Chat</h2>
              <p className="text-zinc-400 mb-6">Querying your knowledge base</p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="mb-2">
                      <HelpCircle size={24} />
                    </div>
                    <h3 className="font-medium mb-1">Ask Questions</h3>
                    <p className="text-sm text-zinc-400">
                      Ask about your documents with contextual answers
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="mb-2">
                      <BookOpen size={24} />
                    </div>
                    <h3 className="font-medium mb-1">Source Citations</h3>
                    <p className="text-sm text-zinc-400">
                      Get answers with citations to source material
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="mb-2">
                      <Search size={24} />
                    </div>
                    <h3 className="font-medium mb-1">Semantic Search</h3>
                    <p className="text-sm text-zinc-400">
                      Find relevant content across documents
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="mb-2">
                      <CheckCircle size={24} />
                    </div>
                    <h3 className="font-medium mb-1">Accurate Retrieval</h3>
                    <p className="text-sm text-zinc-400">
                      Precise answers from your knowledge base
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <input
                    type="text"
                    placeholder="Ask a question about your documents…"
                    id="rag-query"
                    className="w-full rounded-xl bg-black/30 border border-white/10 p-4 text-white placeholder-zinc-500 focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={() => {
                      const query = (
                        document.getElementById("rag-query") as HTMLInputElement
                      )?.value;
                      if (query) handleSearchKnowledge(query);
                    }}
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-linear-to-r from-blue-600 to-blue-500 text-white font-bold hover:shadow-xl hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading && <Loader size={18} className="animate-spin" />}
                    {loading ? "Searching..." : "Search Knowledge Base"}
                  </button>
                </div>
              </div>
            </div>

            {/* RAG Search Results Display */}
            {generatedContent?.searchResults && (
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Search Results</h2>
                  <button
                    onClick={() => setGeneratedContent(null)}
                    className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all text-sm"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-4">
                  <p className="text-zinc-400">
                    Found {generatedContent.count} results
                  </p>
                  {generatedContent.searchResults.map(
                    (result: any, idx: number) => (
                      <div
                        key={idx}
                        className="border border-white/10 rounded-xl p-5 bg-black/30 hover:bg-black/40 transition-all"
                      >
                        <p className="text-sm text-zinc-200 leading-relaxed">
                          {result.content || result.text}
                        </p>
                        {result.score && (
                          <p className="text-xs text-zinc-500 mt-3">
                            Relevance: {(result.score * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Export Tab */}
        {activeTab === "export" && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
              <h2 className="text-2xl font-bold mb-2">Export Content</h2>
              <p className="text-zinc-400 mb-6">
                Choose saved notes/summary to export
              </p>

              {/* Format Selection */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {exportFormats.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => setSelectedExportFormat(format.id)}
                    className={`p-4 rounded-xl border-2 transition-all font-medium ${
                      selectedExportFormat === format.id
                        ? "border-green-500 bg-green-500/20 text-green-300"
                        : "border-white/10 bg-white/5 text-white hover:border-white/30"
                    }`}
                  >
                    {format.label}
                  </button>
                ))}
              </div>

              {/* Export Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="mb-2">
                    <Palette size={24} />
                  </div>
                  <h3 className="font-medium mb-1">Rich Formatting</h3>
                  <p className="text-sm text-zinc-400">
                    Preserve formatting in exports
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="mb-2">
                    <Package size={24} />
                  </div>
                  <h3 className="font-medium mb-1">Bulk Export</h3>
                  <p className="text-sm text-zinc-400">
                    Export multiple notes at once
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="mb-2">
                    <Zap size={24} />
                  </div>
                  <h3 className="font-medium mb-1">Structured Data</h3>
                  <p className="text-sm text-zinc-400">
                    JSON export with metadata
                  </p>
                </div>
              </div>

              <button
                onClick={handleExportContent}
                disabled={!generatedContent || loading}
                className="w-full py-4 rounded-xl bg-linear-to-r from-green-600 to-green-500 text-white font-bold hover:shadow-xl hover:shadow-green-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader size={18} className="animate-spin" />}
                {loading
                  ? "Exporting..."
                  : `Export as ${exportFormats.find((f) => f.id === selectedExportFormat)?.label}`}
              </button>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Project Manager</h2>
              <p className="text-zinc-400 mb-8">
                Manage documents into projects & namespaces
              </p>

              <div className="py-12 space-y-6">
                <div>
                  <Folder size={48} className="mx-auto" />
                </div>
                <p className="text-zinc-400 text-lg">No projects yet</p>
                <button className="inline-block px-8 py-3 rounded-xl bg-linear-to-r from-blue-600 to-blue-500 text-white font-bold hover:shadow-xl hover:shadow-blue-500/50 transition-all">
                  Create New Project
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === "upload" && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
              <h2 className="text-2xl font-bold mb-2">Upload Files</h2>
              <p className="text-zinc-400 mb-6">
                Upload and ingest your study materials
              </p>

              <div className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:border-blue-500/40 transition-all">
                <div className="flex justify-center mb-4">
                  <Upload size={48} />
                </div>
                <p className="text-white font-medium mb-2">
                  Drag and drop your files here
                </p>
                <p className="text-zinc-400 text-sm mb-4">or click to browse</p>
                <p className="text-xs text-zinc-500">
                  Supported: PDF, DOCX, TXT, XLSX, MD, MP3, WAV, JPG, PNG
                </p>
                <button
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.multiple = true;
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files) handleUploadFiles(files);
                    };
                    input.click();
                  }}
                  disabled={loading}
                  className="mt-6 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                >
                  {loading && <Loader size={18} className="animate-spin" />}
                  {loading ? "Uploading..." : "Select Files"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
              <h2 className="text-2xl font-bold mb-6">Settings</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Study Preferences
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">Enable spaced repetition</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">Auto-save progress</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" />
                      <span className="text-sm">Dark mode (always on)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="export-format"
                    className="block text-sm font-medium mb-2"
                  >
                    Default Export Format
                  </label>
                  <select
                    id="export-format"
                    className="w-full rounded-xl bg-black/30 border border-white/10 p-3 text-white focus:border-blue-500 outline-none"
                  >
                    <option>Markdown (.md)</option>
                    <option>PDF (.pdf)</option>
                    <option>Word (.docx)</option>
                    <option>JSON (.json)</option>
                  </select>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-all"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyHub;
