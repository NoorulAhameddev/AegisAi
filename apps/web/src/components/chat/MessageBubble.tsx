import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";
import {
  Bot,
  User,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Eye,
} from "lucide-react";
import { useState } from "react";

interface MessageBubbleProps {
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  onFeedback?: (helpful: boolean) => void;
  onArtifactOpen?: (content: string, language: string) => void;
}

export function MessageBubble({
  role,
  content,
  onFeedback,
  onArtifactOpen,
}: MessageBubbleProps) {
  const isUser = role === "USER";
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (helpful: boolean) => {
    setFeedbackGiven(helpful);
    onFeedback?.(helpful);
  };

  if (role === "SYSTEM") {
    return (
      <div className="flex justify-center my-4 animate-slide-up">
        <span className="eyebrow text-ink-500 bg-ink-900 px-4 py-2 border border-hair">
          {content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full gap-4 md:gap-6 animate-slide-up group",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <div className="shrink-0 mt-1">
          <div className="h-9 w-9 bg-ink-850 border border-ink-700 flex items-center justify-center transition-colors group-hover:border-brand/50">
            <Bot className="h-5 w-5 text-brand" />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "relative max-w-[85%] md:max-w-[75%] px-5 py-4 text-sm md:text-base leading-7",
            isUser
              ? "bg-ink-100 text-ink-950 border-l-2 border-l-brand"
              : "bg-ink-900 border border-ink-800 text-ink-100",
          )}
        >
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:text-ink-100 prose-a:text-brand prose-a:underline prose-pre:my-2 prose-pre:bg-ink-950 prose-pre:border prose-pre:border-ink-800">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  const language = match ? match[1] : "";
                  const codeContent = String(children).replace(/\n$/, "");
                  const isPreviewable = ["html", "svg"].includes(
                    language.toLowerCase(),
                  );

                  return !inline && match ? (
                    <div className="border border-ink-800 my-3 group/code">
                      <div className="bg-ink-900 px-4 py-1.5 text-xs text-ink-500 border-b border-ink-800 flex justify-between items-center font-mono">
                        <span className="font-medium text-ink-500">
                          {language}
                        </span>
                        <div className="flex items-center gap-2">
                          {isPreviewable && onArtifactOpen && (
                            <button
                              onClick={() =>
                                onArtifactOpen(codeContent, language)
                              }
                              className="flex items-center gap-1 p-1 px-2 text-xs text-brand hover:text-ink-100 hover:bg-white/5 border border-brand/30"
                              aria-label="Preview code"
                            >
                              <Eye className="h-3 w-3" />
                              Preview
                            </button>
                          )}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(codeContent);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="p-1 text-xs text-ink-500 hover:text-ink-100 hover:bg-white/5 transition-colors"
                            aria-label="Copy code"
                          >
                            {copied ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={language}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          background: "#080705",
                        }}
                        {...props}
                      >
                        {codeContent}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code
                      className={cn(
                        "bg-ink-800 border border-ink-700 px-1.5 py-0.5 text-xs font-mono text-brand",
                        className,
                      )}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 text-xs text-ink-500 hover:text-ink-100 bg-ink-900 border border-ink-800 font-mono"
              aria-label="Copy message"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>

        {/* Feedback section for AI responses */}
        {!isUser && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pl-12">
            <span className="eyebrow text-ink-600 mr-1">Helpful?</span>
            <button
              onClick={() => handleFeedback(true)}
              className={cn(
                "p-1.5 transition-colors",
                feedbackGiven === true
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-ink-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent",
              )}
              aria-label="Helpful"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleFeedback(false)}
              className={cn(
                "p-1.5 transition-colors",
                feedbackGiven === false
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "text-ink-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent",
              )}
              aria-label="Not helpful"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="shrink-0 mt-1">
          <div className="h-9 w-9 rounded-full bg-ink-800 border border-ink-700 flex items-center justify-center text-xs font-medium text-ink-200">
            <User className="h-5 w-5 text-ink-300" />
          </div>
        </div>
      )}
    </div>
  );
}
