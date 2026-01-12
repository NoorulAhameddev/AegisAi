"use client";

import { useRef, useEffect } from "react";
import { Send, Paperclip, Loader2, StopCircle, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {file && (
        <div className="mb-2 mx-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800/80 border border-white/10 backdrop-blur-md animate-slide-up">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-200 line-clamp-1 max-w-[200px]">{file.name}</span>
            <span className="text-[10px] text-zinc-500">{(file.size / 1024).toFixed(1)} KB</span>
          </div>
          <button 
            onClick={() => setFile(null)}
            className="ml-2 p-1 rounded-full hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Remove file"
            title="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={cn(
        "relative flex items-end gap-2 p-2 rounded-3xl transition-all duration-300",
        "bg-zinc-900/60 backdrop-blur-xl border border-white/10",
        "focus-within:ring-1 focus-within:ring-white/20 focus-within:border-white/20 focus-within:bg-zinc-900/80",
        "shadow-2xl shadow-black/50"
      )}>
        
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
            className="p-2.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
            title="Attach file"
            aria-label="Attach file"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          aria-label="Chat Input"
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-zinc-500 py-3.5 max-h-40 min-h-[52px] resize-none leading-relaxed scrollbar-hide"
          rows={1}
        />

        <div className="pb-1 pr-1">
          <button
            onClick={isLoading ? onStop : onSubmit}
            disabled={(!input.trim() && !file) && !isLoading}
            className={cn(
              "flex items-center justify-center h-10 w-10 rounded-full transition-all duration-300 shadow-lg",
              isLoading 
                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                : "bg-white text-black hover:bg-zinc-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:hover:scale-100"
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
      </div>
      
      <p className="text-center text-[10px] text-zinc-600 mt-3 font-medium">
        Aegis AI can make mistakes. Check important info.
      </p>
    </div>
  );
}
