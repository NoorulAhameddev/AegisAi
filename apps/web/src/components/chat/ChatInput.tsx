"use client";

import { useRef, useEffect, useState } from "react";
import {
  Send,
  Paperclip,
  Loader2,
  StopCircle,
  FileText,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onStop: () => void;
  file: File | null;
  setFile: (file: File | null) => void;
  isUploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const suggestedPrompts = [
  "Analyze this document",
  "Summarize key points",
  "Create an outline",
  "Generate ideas",
];

export function ChatInput({
  input,
  setInput,
  onSubmit,
  isLoading,
  onStop,
  file,
  setFile,
  isUploading,
  onUpload,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
    setShowSuggestions(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {file && (
        <div className="mb-3 mx-4 inline-flex items-center gap-3 px-4 py-3 bg-brand/5 border border-brand/25 animate-slide-up group">
          <div className="p-2 bg-brand/10 text-brand border border-brand/25">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium text-ink-200 truncate">
              {file.name}
            </span>
            <span className="text-xs text-ink-500 font-mono">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <button
            onClick={() => setFile(null)}
            className="p-1.5 hover:bg-white/10 text-ink-500 hover:text-ink-300 transition-colors active:scale-95"
            aria-label="Remove file"
            title="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        className={cn(
          "relative flex items-end gap-2 p-2 transition-colors duration-300",
          "bg-ink-850 border border-ink-700",
          "focus-within:border-brand/50",
          "hover:border-ink-600",
        )}
      >
        <Tooltip content="Attach file" side="top">
          <div className="pb-1 pl-1">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={onUpload}
              disabled={isUploading || isLoading}
              aria-label="File Upload"
            />
            <button
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={isUploading || isLoading}
              className="p-3 hover:bg-white/5 text-ink-400 hover:text-ink-100 transition-colors disabled:opacity-50 active:scale-95"
              title="Attach file"
              aria-label="Attach file"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
            </button>
          </div>
        </Tooltip>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => !input && setShowSuggestions(true)}
          placeholder="Ask anything... (Shift+Enter for new line)"
          aria-label="Chat Input"
          className="flex-1 bg-transparent border-none outline-none text-ink-100 placeholder-ink-500 py-4 px-2 max-h-40 min-h-13 resize-none leading-relaxed scrollbar-hide font-sans"
          rows={1}
        />

        <Tooltip
          content={isLoading ? "Stop generation" : "Send message"}
          side="top"
        >
          <div className="pb-1 pr-1">
            <button
              onClick={isLoading ? onStop : onSubmit}
              disabled={!input.trim() && !file && !isLoading}
              className={cn(
                "flex items-center justify-center h-11 w-11 transition-colors duration-300 active:scale-95",
                isLoading
                  ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                  : "bg-brand text-ink-950 hover:bg-brand-dim disabled:opacity-40 disabled:bg-ink-800 disabled:text-ink-600 disabled:hover:scale-100",
              )}
              title={isLoading ? "Stop" : "Send"}
              aria-label={isLoading ? "Stop generation" : "Send message"}
            >
              {isLoading ? (
                <StopCircle className="h-5 w-5 fill-current" />
              ) : (
                <Send className="h-5 w-5 fill-current ml-0.5" />
              )}
            </button>
          </div>
        </Tooltip>
      </div>

      {/* Suggestion Prompts */}
      {showSuggestions && !input && (
        <div className="mt-4 mx-4 animate-slide-up">
          <div className="flex items-center gap-2 mb-3 eyebrow text-ink-500">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Suggested prompts
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSuggestionClick(prompt)}
                className="px-3 py-2 bg-ink-900 border border-ink-800 text-xs text-ink-400 hover:text-ink-100 hover:bg-ink-850 hover:border-ink-600 transition-colors active:scale-95"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-ink-600 mt-4 font-mono flex items-center justify-center gap-2">
        <span className="h-1 w-1 rounded-full bg-ink-700" />
        Aegis AI Private RAG Workspace • Encrypted Async Pipeline
        <span className="h-1 w-1 rounded-full bg-ink-700" />
      </p>
    </div>
  );
}
