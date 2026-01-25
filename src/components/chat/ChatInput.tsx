"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Paperclip, Loader2, StopCircle, FileText, X, Sparkles } from "lucide-react";
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
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
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
        <div className="mb-3 mx-4 inline-flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-500/5 border border-blue-500/20 backdrop-blur-xl animate-slide-up shadow-lg hover:border-blue-500/30 transition-colors group">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.4)] transition-all">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium text-zinc-200 truncate">{file.name}</span>
            <span className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</span>
          </div>
          <button 
            onClick={() => setFile(null)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-all hover:scale-110 active:scale-95"
            aria-label="Remove file"
            title="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={cn(
        "relative flex items-end gap-2 p-2 rounded-3xl transition-all duration-300",
        "bg-zinc-900/70 backdrop-blur-2xl border border-white/10",
        "focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:border-purple-500/50 focus-within:bg-zinc-900/90",
        "shadow-2xl shadow-black/50 hover:border-white/20"
      )}>
        
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
              className="p-3 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-all disabled:opacity-50 hover:scale-110 active:scale-95"
              title="Attach file"
              aria-label="Attach file"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
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
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-zinc-500 py-4 px-2 max-h-40 min-h-13 resize-none leading-relaxed scrollbar-hide"
          rows={1}
        />

        <Tooltip content={isLoading ? "Stop generation" : "Send message"} side="top">
          <div className="pb-1 pr-1">
            <button
              onClick={isLoading ? onStop : onSubmit}
              disabled={(!input.trim() && !file) && !isLoading}
              className={cn(
                "flex items-center justify-center h-11 w-11 rounded-xl transition-all duration-300 shadow-lg hover:scale-110 active:scale-95",
                isLoading 
                  ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20" 
                  : "bg-linear-to-br from-white to-zinc-100 text-black hover:from-zinc-100 hover:to-zinc-200 disabled:opacity-40 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:hover:scale-100 disabled:from-zinc-800 disabled:to-zinc-800"
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
          <div className="flex items-center gap-2 mb-3 text-xs text-zinc-500">
            <Sparkles className="h-3.5 w-3.5" />
            Suggested prompts
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSuggestionClick(prompt)}
                className="px-3 py-2 rounded-lg bg-zinc-800/50 border border-white/10 text-xs text-zinc-400 hover:text-white hover:bg-zinc-700/50 hover:border-white/20 transition-all group hover:scale-105 active:scale-95"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <p className="text-center text-xs text-zinc-600 mt-4 font-medium flex items-center justify-center gap-2">
        <span className="h-1 w-1 rounded-full bg-zinc-700" />
        Aegis AI can make mistakes. Check important info.
        <span className="h-1 w-1 rounded-full bg-zinc-700" />
      </p>
    </div>
  );
}
